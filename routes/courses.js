const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { teacher_id, student_id } = req.query;
    
    let courseIds = null;
    
    if (student_id) {
      // Get courses where student is enrolled
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', student_id);

      if (!enrollments || enrollments.length === 0) {
        return res.json([]);
      }
      courseIds = enrollments.map(e => e.course_id);
    }

    let query = supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (teacher_id) {
      query = query.eq('teacher_id', teacher_id);
    } else if (courseIds) {
      query = query.in('id', courseIds);
    }

    const { data: courses, error } = await query;

    if (error) throw error;

    // Get teacher info and enrollment counts for each course
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        // Get teacher info
        const { data: teacher } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', course.teacher_id)
          .single();

        // Get enrollment count
        const { count } = await supabase
          .from('course_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        return {
          ...course,
          teacher_first_name: teacher?.first_name || null,
          teacher_last_name: teacher?.last_name || null,
          enrolled_students: count || 0
        };
      })
    );

    res.json(coursesWithCounts);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single course with details
router.get('/:id', async (req, res) => {
  try {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Course not found' });
      }
      throw courseError;
    }

    // Get teacher info
    const { data: teacher } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', course.teacher_id)
      .single();

    // Get enrolled students
    const { data: enrollments, error: studentsError } = await supabase
      .from('course_enrollments')
      .select('enrolled_at, student_id')
      .eq('course_id', req.params.id);

    if (studentsError) throw studentsError;

    // Get student details
    const studentIds = enrollments.map(e => e.student_id);
    const { data: studentUsers } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, email')
      .in('id', studentIds.length > 0 ? studentIds : [-1]);

    // Combine enrollment and student data
    const students = enrollments.map(enrollment => {
      const student = studentUsers?.find(u => u.id === enrollment.student_id);
      return {
        ...student,
        enrolled_at: enrollment.enrolled_at
      };
    }).filter(s => s.id); // Remove any undefined entries

    // Get learning outcomes
    const { data: outcomes, error: outcomesError } = await supabase
      .from('learning_outcomes')
      .select('*')
      .eq('course_id', req.params.id)
      .order('created_at');

    if (outcomesError) throw outcomesError;

    res.json({
      ...course,
      teacher_first_name: teacher?.first_name || null,
      teacher_last_name: teacher?.last_name || null,
      students: students || [],
      learning_outcomes: outcomes || []
    });
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create course
router.post('/', async (req, res) => {
  try {
    const { name, code, description, teacher_id } = req.body;

    if (!name || !code || !teacher_id) {
      return res.status(400).json({ error: 'Name, code, and teacher_id are required' });
    }

    const { data: newCourse, error: insertError } = await supabase
      .from('courses')
      .insert({
        name,
        code,
        description: description || null,
        teacher_id
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Course code already exists' });
      }
      throw insertError;
    }

    // Get teacher info
    const { data: teacher } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', teacher_id)
      .single();

    res.status(201).json({
      ...newCourse,
      teacher_first_name: teacher?.first_name || null,
      teacher_last_name: teacher?.last_name || null
    });
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const { error: updateError } = await supabase
      .from('courses')
      .update({
        name,
        code,
        description: description || null
      })
      .eq('id', req.params.id);

    if (updateError) {
      if (updateError.code === '23505') {
        return res.status(400).json({ error: 'Course code already exists' });
      }
      throw updateError;
    }

    const { data: updated, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Course not found' });
      }
      throw fetchError;
    }

    // Get teacher info
    const { data: teacher } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', updated.teacher_id)
      .single();

    res.json({
      ...updated,
      teacher_first_name: teacher?.first_name || null,
      teacher_last_name: teacher?.last_name || null
    });
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete course
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Enroll student in course
router.post('/:id/enroll', async (req, res) => {
  try {
    const { student_id } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    const { error } = await supabase
      .from('course_enrollments')
      .insert({
        student_id,
        course_id: req.params.id
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Student already enrolled' });
      }
      throw error;
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error enrolling student:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Unenroll student from course
router.delete('/:id/enroll/:student_id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('course_id', req.params.id)
      .eq('student_id', req.params.student_id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error unenrolling student:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
