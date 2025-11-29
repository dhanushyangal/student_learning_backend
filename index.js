// Backend entry (Express)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses');
const assessmentsRouter = require('./routes/assessments');
const studentsRouter = require('./routes/students');
const reportsRouter = require('./routes/reports');
const outcomesRouter = require('./routes/outcomes');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Student Learning Outcomes API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      courses: '/api/courses',
      assessments: '/api/assessments',
      students: '/api/students',
      reports: '/api/reports',
      outcomes: '/api/outcomes'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Handle favicon requests (prevent 404s)
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/outcomes', outcomesRouter);

// Export for Vercel serverless functions
module.exports = app;

// Only listen if running locally (not on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log('\n\x1b[32m%s\x1b[0m', '✓ Server started successfully');
    console.log(`  → Local:   http://localhost:${PORT}`);
    console.log(`  → API URL: http://localhost:${PORT}/api`);
    console.log('\nRoutes available:');
    console.log('  AUTH:');
    console.log('    POST   /api/auth/register');
    console.log('    POST   /api/auth/login');
    console.log('  COURSES:');
    console.log('    GET    /api/courses');
    console.log('    GET    /api/courses/:id');
    console.log('    POST   /api/courses');
    console.log('    PUT    /api/courses/:id');
    console.log('    DELETE /api/courses/:id');
    console.log('    POST   /api/courses/:id/enroll');
    console.log('  ASSESSMENTS:');
    console.log('    GET    /api/assessments');
    console.log('    GET    /api/assessments/:id');
    console.log('    POST   /api/assessments');
    console.log('    PUT    /api/assessments/:id');
    console.log('    DELETE /api/assessments/:id');
    console.log('    POST   /api/assessments/:id/grade');
    console.log('    GET    /api/assessments/:id/grades');
    console.log('  STUDENTS:');
    console.log('    GET    /api/students');
    console.log('    GET    /api/students/:id');
    console.log('    GET    /api/students/:id/courses/:course_id');
    console.log('  REPORTS:');
    console.log('    GET    /api/reports/course/:course_id');
    console.log('    GET    /api/reports/student/:student_id');
    console.log('  OUTCOMES:');
    console.log('    GET    /api/outcomes/course/:course_id');
    console.log('    POST   /api/outcomes');
    console.log('    PUT    /api/outcomes/:id');
    console.log('    DELETE /api/outcomes/:id\n');
  });
}
