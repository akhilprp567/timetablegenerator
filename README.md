# 📘 Smart Timetable Generator System
*Automated Multi-Class Timetable Generation using Django REST API + React TypeScript*

---

## 📌 Overview
This project generates **conflict-free academic timetables** for multiple sections, semesters, and faculty using **Constraint Satisfaction Programming (CSP)** in Python. The system enforces strict faculty hour limits, optimizes room allocation, and provides a user-friendly React interface.

✨ **Key Features:**
- 🎯 **Smart Constraint-Based Scheduling** - Respects faculty hour limits, room availability, and academic requirements
- 🏫 **Multi-Institution Support** - One-time setup for institution, faculty, and infrastructure
- 📱 **Modern React UI** - Step-by-step wizard with real-time validation
- 📊 **Faculty Hour Management** - Strict enforcement of weekly teaching limits
- 🔄 **Flexible Academic Setup** - Generate multiple timetables without re-entering infrastructure data
- 📄 **Export Capabilities** - Download as PDF or JSON format
- 🔐 **User Authentication** - Secure user management with token-based auth

---

## 🏗️ System Architecture

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│   React Frontend│ ─────────────→  │  Django Backend │
│   (Port 5173)   │                 │   (Port 8000)   │
│                 │ ←─────────────── │                 │
├─────────────────┤                 ├─────────────────┤
│ • SetupWizard   │                 │ • Authentication│
│ • Dashboard     │                 │ • Views/APIs    │
│ • TimetableView │                 │ • Models        │
│ • TimetableList │                 │ • CSP Algorithm │
└─────────────────┘                 └─────────────────┘
                                             │
                                             │
                                    ┌─────────────────┐
                                    │  PostgreSQL DB  │
                                    │   (Port 5432)   │
                                    │                 │
                                    │ • User Data     │
                                    │ • Institution   │
                                    │ • Timetables    │
                                    └─────────────────┘
```

---

## 🗂️ Project Structure

```
timetablegen/
├── backend/                          # Django REST API Backend
│   ├── backend/                      # Core Django project
│   │   ├── __init__.py
│   │   ├── settings.py              # Database, CORS, authentication
│   │   ├── urls.py                  # Main URL routing
│   │   └── wsgi.py
│   ├── scheduler/                    # Main Django app
│   │   ├── models.py                # Database models (Course, Faculty, etc.)
│   │   ├── views.py                 # REST API endpoints
│   │   ├── urls.py                  # App-specific URLs
│   │   ├── authentication.py        # User auth (login/register)
│   │   ├── timetable_generator.py   # CSP algorithm implementation
│   │   └── migrations/              # Database migration files
│   │       └── 0001_initial.py      # Initial database schema
│   ├── manage.py                    # Django management commands
│   ├── requirements.txt             # Python dependencies
│   └── venv/                        # Virtual environment (created locally)
│
└── frontend/                        # React TypeScript Frontend
    ├── src/
    │   ├── components/ui/           # Reusable UI components (Button, Card, etc.)
    │   ├── pages/                   # Main application pages
    │   │   ├── Login.tsx           # User authentication
    │   │   ├── Register.tsx        # User registration
    │   │   ├── Dashboard.tsx       # Main dashboard with setup status
    │   │   ├── SetupWizard.tsx     # 5-step setup wizard
    │   │   ├── TimetableView.tsx   # Individual timetable viewer
    │   │   └── TimetableList.tsx   # List all generated timetables
    │   ├── lib/
    │   │   └── utils.ts            # Utility functions
    │   └── App.tsx                 # Main app component with routing
    ├── public/                     # Static assets
    ├── package.json               # Node.js dependencies
    ├── vite.config.ts             # Vite build configuration
    ├── tailwind.config.js         # Tailwind CSS configuration
    └── tsconfig.json              # TypeScript configuration
```

---

## 🔧 Prerequisites

| Software   | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.10+ (tested on 3.12/3.13) | Backend development |
| **Node.js** | 18+ or 20+ | Frontend development |
| **PostgreSQL** | 14+ | Primary database |
| **npm/yarn** | 8+ | Package management |
| **Git** | Latest | Version control |

---

## 🛠️ Installation Guide

### 🗃️ Database Setup (PostgreSQL)

#### Windows:
1. Download and install PostgreSQL from [official website](https://www.postgresql.org/download/windows/)
2. Open **SQL Shell (psql)** or **pgAdmin**
3. Create database and user:

```sql
CREATE DATABASE timetable_db;
CREATE USER timetable_user WITH PASSWORD 'timetable_pass';
GRANT ALL PRIVILEGES ON DATABASE timetable_db TO timetable_user;
ALTER DATABASE timetable_db OWNER TO timetable_user;
```

#### macOS/Linux:
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib  # Ubuntu/Debian
brew install postgresql                              # macOS

# Start PostgreSQL service
sudo systemctl start postgresql    # Linux
brew services start postgresql     # macOS

# Create database
sudo -u postgres psql
```
Then run the same SQL commands above.

### 🐍 Backend Setup (Django)

#### Windows:
```cmd
cd timetablegen\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### macOS/Linux:
```bash
cd timetablegen/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 📦 Backend Dependencies (requirements.txt)

```txt
Django==5.2.8
djangorestframework==3.16.1
django-cors-headers==4.5.0
psycopg2-binary==2.9.9
python-constraint==1.4.0
reportlab==4.1.0
openpyxl==3.1.3
Pillow==10.1.0
```

### 🗃️ Database Configuration

Update `backend/backend/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'timetable_db',
        'USER': 'timetable_user',
        'PASSWORD': 'timetable_pass',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 🔄 Database Migration

```bash
# Apply migrations
python manage.py migrate

# Create superuser for Django admin
python manage.py createsuperuser
```

### 🌐 Frontend Setup (React)

#### Windows:
```cmd
cd timetablegen\frontend
npm install
```

#### macOS/Linux:
```bash
cd timetablegen/frontend
npm install
```

### 📦 Frontend Dependencies

Key dependencies in `package.json`:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.263.1",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.2",
    "vite": "^5.0.0"
  }
}
```

---

## 🚀 Running the Project

### 1. Start Backend Server

#### Windows:
```cmd
cd backend
venv\Scripts\activate
python manage.py runserver
```

#### macOS/Linux:
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Backend URL:** http://127.0.0.1:8000

### 2. Start Frontend Server

```bash
cd frontend
npm run dev
```

**Frontend URL:** http://localhost:5173

---

## 🔗 API Endpoints

### Authentication
- `POST /timetable/auth/register/` - User registration
- `POST /timetable/auth/login/` - User login
- `POST /timetable/auth/logout/` - User logout
- `GET /timetable/auth/profile/` - Get user profile

### Setup & Generation
- `GET /timetable/setup/status/` - Check setup completion status
- `POST /timetable/setup/institute/` - Save one-time institute setup
- `POST /timetable/setup/academic/` - Generate timetable with academic data
- `POST /timetable/generate/` - Complete setup and generate (legacy)

### Timetable Management
- `GET /timetable/view/<section_id>/` - View specific timetable
- `GET /timetable/list/` - List all generated timetables
- `GET /timetable/navigation/<section_id>/` - Get navigation data

---

## 🗄️ Database Models

### Core Models
- **Course** - Course information (MCA, BE CSE, etc.)
- **Semester** - Semester details linked to courses
- **Section** - Class sections within semesters
- **Subject** - Subjects with weekly hours and lab requirements
- **Faculty** - Faculty with hour limits and user association
- **Room** - Classrooms and labs with user association
- **InstitutionSettings** - Institution config with user ownership

### Scheduling Models
- **TimetableSlot** - Day/period combinations
- **ScheduledSession** - Final timetable entries
- **FacultySubjectAllocation** - Faculty-subject assignments

---

## 🔄 Application Flow

### 1. First-Time User Journey
```
Register → Login → Dashboard → Setup Wizard
├── Step 1: Institution Details (name, academic year, working days)
├── Step 2: Infrastructure (rooms, labs)
├── Step 3: Faculty (with hour limits)
├── Step 4: Academic Structure (semesters, sections, subjects)
└── Step 5: Review & Generate → Timetable View
```

### 2. Returning User Journey
```
Login → Dashboard → Generate New Timetable
├── Academic Setup Only (reuses saved infrastructure)
└── Generate → Timetable View/List
```

### 3. Timetable Generation Algorithm
```
Input Validation → Faculty Hour Tracking → Room Allocation
→ Constraint Satisfaction → Conflict Resolution → Output Generation
```

---

## 🛠️ Development & Customization

### Adding New Features

#### Backend (Django):
1. **Models**: Add/modify `scheduler/models.py`
2. **APIs**: Create views in `scheduler/views.py`
3. **URLs**: Update `scheduler/urls.py`
4. **Migrations**: Run `python manage.py makemigrations`

#### Frontend (React):
1. **Pages**: Add new components in `src/pages/`
2. **Routing**: Update `src/App.tsx`
3. **UI Components**: Extend `src/components/ui/`

### Customizing Constraints

Edit `scheduler/timetable_generator.py` to modify:
- Faculty hour limits
- Room allocation logic
- Day distribution algorithms
- Conflict resolution strategies

---

## 🧪 Testing the System

### Backend Testing
```bash
# Test API endpoints
curl -X POST http://127.0.0.1:8000/timetable/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test", "password":"password"}'
```

### Frontend Testing
1. Register a new user
2. Complete institute setup
3. Generate a timetable
4. View and download results

### Test Data
**Default Admin:**
- Username: `akhilesh`
- Password: `Akhil@456`

**Sample User:**
- Username: `test`
- Password: `password`

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `pip/python not found` | Ensure Python is in PATH, recreate venv |
| `psycopg2 installation error` | Install PostgreSQL dev headers: `apt-get install libpq-dev` |
| `CORS errors` | Ensure `django-cors-headers` is installed and configured |
| `Token authentication failed` | Check if user is logged in, token exists |
| `Faculty hour limit exceeded` | Adjust faculty max_hours_per_week in setup |
| `No rooms available` | Add more rooms or reduce lab requirements |
| `Timetable generation fails` | Check faculty assignments, ensure adequate resources |

---

## 🔧 Environment Configuration

### Backend Environment Variables (`.env`)
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://timetable_user:timetable_pass@localhost:5432/timetable_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend Environment Variables (`.env.local`)
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_APP_NAME=Smart Timetable Generator
```

---

## 📈 Future Enhancements

### Planned Features
- 🧠 **AI-based optimization** using Genetic Algorithms
- 📱 **Mobile responsive design** for tablets/phones
- 📊 **Advanced analytics** and reporting
- 🔄 **Auto-rescheduling** for conflicts
- 🏢 **Multi-department support**
- 📅 **Google Calendar integration**
- 📧 **Email notifications** for timetable changes
- 🌐 **Multi-language support**

### Performance Improvements
- Redis caching for faster API responses
- Background task processing for large institutions
- Database query optimization
- Frontend code splitting and lazy loading

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

For issues and questions:
- 📧 Email: support@timetablegenerator.com
- 🐛 GitHub Issues: [Create an issue](https://github.com/yourusername/timetablegen/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/timetablegen/wiki)

---

**Made with ❤️ using Django REST Framework & React TypeScript**