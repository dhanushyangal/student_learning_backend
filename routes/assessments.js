const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get all assessments
router.get('/', async (req, res) => {
  try {
    const { course_id, student_id } = req.query;
    
    let query = supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (course_id) {
      query = query.eq('course_id', course_id);
    } else if (student_id) {
      // Get courses where student is enrolled
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', student_id);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        query = query.in('course_id', courseIds);
      } else {
        return res.json([]);
      }
    }

    const { data: assessments, error } = await query;

    if (error) throw error;

    // Get course and creator info for each assessment
    const formatted = await Promise.all(
      (assessments || []).map(async (a) => {
        const [courseRes, creatorRes] = await Promise.all([
          supabase.from('courses').select('name, code').eq('id', a.course_id).single(),
          supabase.from('users').select('first_name, last_name').eq('id', a.created_by).single()
        ]);

        return {
          ...a,
          course_name: courseRes.data?.name || null,
          course_code: courseRes.data?.code || null,
          creator_first_name: creatorRes.data?.first_name || null,
          creator_last_name: creatorRes.data?.last_name || null
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching assessments:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single assessment with details
router.get('/:id', async (req, res) => {
  try {
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (assessError) {
      if (assessError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Assessment not found' });
      }
      throw assessError;
    }

    // Get course and creator info
    const [courseRes, creatorRes] = await Promise.all([
      supabase.from('courses').select('name, code').eq('id', assessment.course_id).single(),
      supabase.from('users').select('first_name, last_name').eq('id', assessment.created_by).single()
    ]);

    // Get learning outcomes
    const { data: outcomes, error: outcomesError } = await supabase
      .from('assessment_outcomes')
      .select('weight, learning_outcome_id')
      .eq('assessment_id', req.params.id);

    if (outcomesError) throw outcomesError;

    // Get learning outcome details
    const outcomeIds = (outcomes || []).map(o => o.learning_outcome_id);
    const { data: learningOutcomes } = await supabase
      .from('learning_outcomes')
      .select('*')
      .in('id', outcomeIds.length > 0 ? outcomeIds : [-1]);

    const formattedOutcomes = (outcomes || []).map(ao => {
      const outcome = learningOutcomes?.find(lo => lo.id === ao.learning_outcome_id);
      return {
        ...outcome,
        weight: ao.weight
      };
    }).filter(o => o.id);

    res.json({
      ...assessment,
      course_name: courseRes.data?.name || null,
      course_code: courseRes.data?.code || null,
      creator_first_name: creatorRes.data?.first_name || null,
      creator_last_name: creatorRes.data?.last_name || null,
      learning_outcomes: formattedOutcomes
    });
  } catch (err) {
    console.error('Error fetching assessment:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create assessment
router.post('/', async (req, res) => {
  try {
    const { course_id, title, description, assessment_type, max_score, due_date, created_by, learning_outcomes } = req.body;

    if (!course_id || !title || !assessment_type || !max_score || !created_by) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const { data: newAssessment, error: insertError } = await supabase
      .from('assessments')
      .insert({
        course_id,
        title,
        description: description || null,
        assessment_type,
        max_score,
        due_date: due_date || null,
        created_by
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    const assessmentId = newAssessment.id;

    // Link learning outcomes if provided
    if (learning_outcomes && Array.isArray(learning_outcomes) && learning_outcomes.length > 0) {
      const outcomeLinks = learning_outcomes.map(outcome => ({
        assessment_id: assessmentId,
        learning_outcome_id: outcome.id,
        weight: outcome.weight || 1.00
      }));

      const { error: linkError } = await supabase
        .from('assessment_outcomes')
        .insert(outcomeLinks);

      if (linkError) {
        console.error('Error linking outcomes:', linkError);
        // Continue anyway - assessment is created
      }
    }

    // Get course info
    const { data: course } = await supabase
      .from('courses')
      .select('name, code')
      .eq('id', course_id)
      .single();

    res.status(201).json({
      ...newAssessment,
      course_name: course?.name || null,
      course_code: course?.code || null
    });
  } catch (err) {
    console.error('Error creating assessment:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update assessment
router.put('/:id', async (req, res) => {
  try {
    const { title, description, assessment_type, max_score, due_date } = req.body;
    
    const { error: updateError } = await supabase
      .from('assessments')
      .update({
        title,
        description: description || null,
        assessment_type,
        max_score,
        due_date: due_date || null
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: updated, error: fetchError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Assessment not found' });
      }
      throw fetchError;
    }

    // Get course info
    const { data: course } = await supabase
      .from('courses')
      .select('name, code')
      .eq('id', updated.course_id)
      .single();

    res.json({
      ...updated,
      course_name: course?.name || null,
      course_code: course?.code || null
    });
  } catch (err) {
    console.error('Error updating assessment:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete assessment
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting assessment:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Grade student assessment
router.post('/:id/grade', async (req, res) => {
  try {
    const { student_id, score, feedback, graded_by } = req.body;
    
    if (!student_id || score === undefined) {
      return res.status(400).json({ error: 'student_id and score are required' });
    }

    // Get assessment max_score
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .select('max_score')
      .eq('id', req.params.id)
      .single();

    if (assessError || !assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const maxScore = assessment.max_score;
    const percentage = (score / maxScore) * 100;

    // Upsert grade (insert or update)
    const { data: grade, error: gradeError } = await supabase
      .from('student_assessments')
      .upsert({
        student_id,
        assessment_id: req.params.id,
        score,
        max_score: maxScore,
        percentage,
        feedback: feedback || null,
        graded_by: graded_by || null,
        graded_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,assessment_id'
      })
      .select('*')
      .single();

    if (gradeError) throw gradeError;

    // Get student info
    const { data: student } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', student_id)
      .single();

    res.json({
      ...grade,
      student_first_name: student?.first_name || null,
      student_last_name: student?.last_name || null
    });
  } catch (err) {
    console.error('Error grading assessment:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get student grades for an assessment (includes all enrolled students)
router.get('/:id/grades', async (req, res) => {
  try {
    // Get assessment course_id and max_score
    const { data: assessment, error: assessError } = await supabase
      .from('assessments')
      .select('course_id, max_score')
      .eq('id', req.params.id)
      .single();

    if (assessError || !assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const courseId = assessment.course_id;
    const maxScore = assessment.max_score;

    // Get all enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId);

    if (enrollError) throw enrollError;

    // Get student details
    const studentIds = (enrollments || []).map(e => e.student_id);
    const { data: students } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', studentIds.length > 0 ? studentIds : [-1]);

    // Get all grades for this assessment
    const { data: grades, error: gradesError } = await supabase
      .from('student_assessments')
      .select('*')
      .eq('assessment_id', req.params.id);

    if (gradesError) throw gradesError;

    // Combine students with their grades
    const gradesMap = new Map();
    (grades || []).forEach(grade => {
      gradesMap.set(grade.student_id, grade);
    });

    const result = (students || []).map(student => {
      const grade = gradesMap.get(student.id);

      return {
        student_id: student.id,
        student_first_name: student.first_name,
        student_last_name: student.last_name,
        student_email: student.email,
        score: grade?.score || null,
        max_score: grade?.max_score || maxScore,
        percentage: grade?.percentage || null,
        feedback: grade?.feedback || null,
        graded_at: grade?.graded_at || null,
        graded_by: grade?.graded_by || null
      };
    });

    // Sort by last name, first name
    result.sort((a, b) => {
      if (a.student_last_name !== b.student_last_name) {
        return (a.student_last_name || '').localeCompare(b.student_last_name || '');
      }
      return (a.student_first_name || '').localeCompare(b.student_first_name || '');
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching grades:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
