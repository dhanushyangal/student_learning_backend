const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get all students
router.get('/', async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name, created_at')
      .eq('role', 'student')
      .order('last_name')
      .order('first_name');

    if (error) throw error;

    res.json(students || []);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single student with progress
router.get('/:id', async (req, res) => {
  try {
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name, created_at')
      .eq('id', req.params.id)
      .eq('role', 'student')
      .single();

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Student not found' });
      }
      throw studentError;
    }

    // Get enrolled courses
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select(`
        enrolled_at,
        courses(*)
      `)
      .eq('student_id', req.params.id);

    if (enrollError) throw enrollError;

    const courses = enrollments.map(e => ({
      ...e.courses,
      enrolled_at: e.enrolled_at
    }));

    // Get all assessments with grades for enrolled courses
    const courseIds = courses.map(c => c.id);
    
    let assessments = [];
    if (courseIds.length > 0) {
      const { data: assessmentsData, error: assessError } = await supabase
        .from('assessments')
        .select(`
          *,
          courses(name, code),
          student_assessments!inner(
            score,
            max_score,
            percentage,
            feedback,
            graded_at
          )
        `)
        .in('course_id', courseIds)
        .eq('student_assessments.student_id', req.params.id)
        .order('created_at', { ascending: false });

      if (assessError) throw assessError;

      assessments = (assessmentsData || []).map(a => ({
        ...a,
        course_name: a.courses?.name || null,
        course_code: a.courses?.code || null,
        score: a.student_assessments?.[0]?.score || null,
        max_score: a.student_assessments?.[0]?.max_score || null,
        percentage: a.student_assessments?.[0]?.percentage || null,
        feedback: a.student_assessments?.[0]?.feedback || null,
        graded_at: a.student_assessments?.[0]?.graded_at || null
      }));
    }

    // Get all assessments (including ungraded ones)
    const { data: allAssessments, error: allAssessError } = await supabase
      .from('assessments')
      .select(`
        *,
        courses(name, code)
      `)
      .in('course_id', courseIds.length > 0 ? courseIds : [-1])
      .order('created_at', { ascending: false });

    if (allAssessError) throw allAssessError;

    // Merge with grades
    const allAssessmentsWithGrades = (allAssessments || []).map(assessment => {
      const grade = assessments.find(a => a.id === assessment.id);
      return {
        ...assessment,
        course_name: assessment.courses?.name || null,
        course_code: assessment.courses?.code || null,
        score: grade?.score || null,
        max_score: grade?.max_score || null,
        percentage: grade?.percentage || null,
        feedback: grade?.feedback || null,
        graded_at: grade?.graded_at || null
      };
    });

    // Calculate overall statistics
    const gradedAssessments = allAssessmentsWithGrades.filter(a => a.score !== null);
    const totalScore = gradedAssessments.reduce((sum, a) => sum + (a.score || 0), 0);
    const totalMaxScore = gradedAssessments.reduce((sum, a) => sum + (a.max_score || 0), 0);
    const averagePercentage = gradedAssessments.length > 0
      ? gradedAssessments.reduce((sum, a) => sum + (a.percentage || 0), 0) / gradedAssessments.length
      : null;

    res.json({
      ...student,
      courses,
      assessments: allAssessmentsWithGrades,
      statistics: {
        total_assessments: allAssessmentsWithGrades.length,
        graded_assessments: gradedAssessments.length,
        average_score: totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : null,
        average_percentage: averagePercentage
      }
    });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get student progress by course
router.get('/:id/courses/:course_id', async (req, res) => {
  try {
    const { id, course_id } = req.params;

    // Verify enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('student_id', id)
      .eq('course_id', course_id)
      .single();

    if (enrollError || !enrollment) {
      return res.status(404).json({ error: 'Student not enrolled in this course' });
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError) throw courseError;

    // Get assessments with grades
    const { data: assessments, error: assessError } = await supabase
      .from('assessments')
      .select(`
        *,
        student_assessments!left(
          score,
          max_score,
          percentage,
          feedback,
          graded_at
        )
      `)
      .eq('course_id', course_id)
      .eq('student_assessments.student_id', id)
      .order('created_at', { ascending: false });

    if (assessError) throw assessError;

    // Format assessments
    const formattedAssessments = (assessments || []).map(a => ({
      ...a,
      score: a.student_assessments?.[0]?.score || null,
      max_score: a.student_assessments?.[0]?.max_score || null,
      percentage: a.student_assessments?.[0]?.percentage || null,
      feedback: a.student_assessments?.[0]?.feedback || null,
      graded_at: a.student_assessments?.[0]?.graded_at || null
    }));

    // Get learning outcomes progress
    const { data: outcomes, error: outcomesError } = await supabase
      .from('learning_outcomes')
      .select(`
        *,
        assessment_outcomes(
          assessments(
            student_assessments!inner(percentage)
          )
        )
      `)
      .eq('course_id', course_id);

    if (outcomesError) throw outcomesError;

    // Calculate progress for each outcome
    const outcomesWithProgress = (outcomes || []).map(outcome => {
      const allPercentages = [];
      outcome.assessment_outcomes?.forEach(ao => {
        ao.assessments?.forEach(assessment => {
          assessment.student_assessments?.forEach(sa => {
            if (sa.percentage !== null) {
              allPercentages.push(sa.percentage);
            }
          });
        });
      });

      const averagePercentage = allPercentages.length > 0
        ? allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length
        : null;

      return {
        id: outcome.id,
        course_id: outcome.course_id,
        title: outcome.title,
        description: outcome.description,
        created_at: outcome.created_at,
        average_percentage: averagePercentage,
        assessments_count: outcome.assessment_outcomes?.length || 0
      };
    });

    res.json({
      course,
      assessments: formattedAssessments,
      learning_outcomes: outcomesWithProgress
    });
  } catch (err) {
    console.error('Error fetching student course progress:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
