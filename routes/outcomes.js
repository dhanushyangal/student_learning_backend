const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Get all learning outcomes for a course
router.get('/course/:course_id', async (req, res) => {
  try {
    const { data: outcomes, error } = await supabase
      .from('learning_outcomes')
      .select('*')
      .eq('course_id', req.params.course_id)
      .order('created_at');

    if (error) throw error;

    res.json(outcomes || []);
  } catch (err) {
    console.error('Error fetching learning outcomes:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create learning outcome
router.post('/', async (req, res) => {
  try {
    const { course_id, title, description } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({ error: 'course_id and title are required' });
    }

    const { data: newOutcome, error: insertError } = await supabase
      .from('learning_outcomes')
      .insert({
        course_id,
        title,
        description: description || null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json(newOutcome);
  } catch (err) {
    console.error('Error creating learning outcome:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update learning outcome
router.put('/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const { error: updateError } = await supabase
      .from('learning_outcomes')
      .update({
        title,
        description: description || null
      })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    const { data: updated, error: fetchError } = await supabase
      .from('learning_outcomes')
      .select()
      .eq('id', req.params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Learning outcome not found' });
      }
      throw fetchError;
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating learning outcome:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete learning outcome
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('learning_outcomes')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting learning outcome:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
