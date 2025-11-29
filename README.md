# Task Tracker CRUD API Server

Express.js API server for Student Learning Outcomes Tracking System, deployed on Vercel with Supabase backend.

## Quick Start

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**:
   Create a `.env` file:
   ```env
   SUPABASE_URL=https://drlkgrumakxitjprvqws.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   PORT=4000
   NODE_ENV=development
   ```

3. **Run Server**:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `POST /api/courses/:id/enroll` - Enroll student
- `DELETE /api/courses/:id/enroll/:student_id` - Unenroll student

### Assessments
- `GET /api/assessments` - Get all assessments
- `GET /api/assessments/:id` - Get assessment by ID
- `POST /api/assessments` - Create assessment
- `PUT /api/assessments/:id` - Update assessment
- `DELETE /api/assessments/:id` - Delete assessment
- `POST /api/assessments/:id/grade` - Grade student assessment
- `GET /api/assessments/:id/grades` - Get all grades for assessment

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID with progress
- `GET /api/students/:id/courses/:course_id` - Get student course progress

### Reports
- `GET /api/reports/course/:course_id` - Get course performance report
- `GET /api/reports/student/:student_id` - Get student performance report

### Learning Outcomes
- `GET /api/outcomes/course/:course_id` - Get outcomes for course
- `POST /api/outcomes` - Create learning outcome
- `PUT /api/outcomes/:id` - Update learning outcome
- `DELETE /api/outcomes/:id` - Delete learning outcome

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Vercel deployment instructions.

## Project Structure

```
server/
├── index.js              # Main server file
├── db.js                 # Supabase connection
├── package.json          # Dependencies
├── vercel.json          # Vercel configuration
├── .gitignore           # Git ignore rules
├── .env.example         # Environment variables template
├── DEPLOYMENT.md        # Deployment guide
└── routes/              # API route handlers
    ├── auth.js
    ├── courses.js
    ├── assessments.js
    ├── students.js
    ├── outcomes.js
    └── reports.js
```

## Technologies

- **Express.js** - Web framework
- **Supabase** - PostgreSQL database with real-time features
- **bcryptjs** - Password hashing
- **Vercel** - Serverless deployment platform

## Environment Variables

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)
- `SUPABASE_ANON_KEY` - Anonymous key (for client-side)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (optional, defaults to 4000)

## License

MIT
# student_learning_backend
