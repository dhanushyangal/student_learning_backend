const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get course performance report
router.get('/course/:course_id', async (req, res) => {
  try {
    const { course_id } = req.params;

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get all students in course
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select(`
        users!course_enrollments_student_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('course_id', course_id);

    if (enrollError) throw enrollError;

    const students = (enrollments || []).map(e => e.users);

    // Get all assessments
    const { data: assessments, error: assessError } = await supabase
      .from('assessments')
      .select('*')
      .eq('course_id', course_id)
      .order('created_at');

    if (assessError) throw assessError;

    // Get grades for all students
    const studentStats = await Promise.all(
      students.map(async (student) => {
        const { data: grades, error: gradesError } = await supabase
          .from('student_assessments')
          .select(`
            *,
            assessments!inner(title, assessment_type, max_score)
          `)
          .eq('student_id', student.id)
          .eq('assessments.course_id', course_id);

        if (gradesError) throw gradesError;

        const formattedGrades = (grades || []).map(g => ({
          ...g,
          title: g.assessments?.title || null,
          assessment_type: g.assessments?.assessment_type || null,
          max_score: g.assessments?.max_score || g.max_score || null
        }));

        const totalScore = formattedGrades.reduce((sum, g) => sum + (g.score || 0), 0);
        const totalMaxScore = formattedGrades.reduce((sum, g) => sum + (g.max_score || 0), 0);
        const averagePercentage = formattedGrades.length > 0
          ? formattedGrades.reduce((sum, g) => sum + (g.percentage || 0), 0) / formattedGrades.length
          : 0;

        return {
          ...student,
          grades: formattedGrades,
          total_score: totalScore,
          total_max_score: totalMaxScore,
          average_percentage: averagePercentage,
          completed_assessments: formattedGrades.length,
          total_assessments: assessments?.length || 0
        };
      })
    );

    // Overall course statistics
    const { data: allGrades, error: allGradesError } = await supabase
      .from('student_assessments')
      .select('percentage')
      .in('assessment_id', (assessments || []).map(a => a.id));

    if (allGradesError) throw allGradesError;

    const allPercentages = (allGrades || []).map(g => g.percentage).filter(p => p !== null);
    const courseAverage = allPercentages.length > 0
      ? allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length
      : 0;

    res.json({
      course,
      assessments: assessments || [],
      students: studentStats,
      statistics: {
        total_students: students.length,
        total_assessments: assessments?.length || 0,
        course_average: courseAverage,
        completion_rate: assessments && assessments.length > 0
          ? (studentStats.reduce((sum, s) => sum + s.completed_assessments, 0) / (assessments.length * students.length)) * 100
          : 0
      }
    });
  } catch (err) {
    console.error('Error generating course report:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get student performance report
router.get('/student/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;

    // Get student details
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, username, email, first_name, last_name')
      .eq('id', student_id)
      .eq('role', 'student')
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all courses with enrollment
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select(`
        enrolled_at,
        courses(*)
      `)
      .eq('student_id', student_id);

    if (enrollError) throw enrollError;

    const courses = (enrollments || []).map(e => ({
      ...e.courses,
      enrolled_at: e.enrolled_at
    }));

    const courseReports = await Promise.all(
      courses.map(async (course) => {
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
          .eq('course_id', course.id)
          .eq('student_assessments.student_id', student_id)
          .order('created_at');

        if (assessError) throw assessError;

        const formattedAssessments = (assessments || []).map(a => ({
          ...a,
          score: a.student_assessments?.[0]?.score || null,
          max_score: a.student_assessments?.[0]?.max_score || null,
          percentage: a.student_assessments?.[0]?.percentage || null,
          feedback: a.student_assessments?.[0]?.feedback || null,
          graded_at: a.student_assessments?.[0]?.graded_at || null
        }));

        const graded = formattedAssessments.filter(a => a.score !== null);
        const totalScore = graded.reduce((sum, a) => sum + (a.score || 0), 0);
        const totalMaxScore = graded.reduce((sum, a) => sum + (a.max_score || 0), 0);
        const avgPercentage = graded.length > 0
          ? graded.reduce((sum, a) => sum + (a.percentage || 0), 0) / graded.length
          : null;

        return {
          ...course,
          assessments: formattedAssessments,
          performance: {
            total_assessments: formattedAssessments.length,
            completed: graded.length,
            average_percentage: avgPercentage,
            total_score: totalScore,
            total_max_score: totalMaxScore
          }
        };
      })
    );

    // Overall statistics
    const allAssessments = courseReports.flatMap(cr => cr.assessments);
    const allGraded = allAssessments.filter(a => a.score !== null);
    const overallAvg = allGraded.length > 0
      ? allGraded.reduce((sum, a) => sum + (a.percentage || 0), 0) / allGraded.length
      : null;

    res.json({
      student,
      courses: courseReports,
      overall_statistics: {
        total_courses: courses.length,
        total_assessments: allAssessments.length,
        completed_assessments: allGraded.length,
        overall_average: overallAvg
      }
    });
  } catch (err) {
    console.error('Error generating student report:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
