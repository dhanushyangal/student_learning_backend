
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
