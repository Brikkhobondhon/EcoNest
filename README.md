# EcoNest - Employee Management System

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

A comprehensive React Native employee management system built with Expo and Supabase, featuring role-based access control and cross-platform compatibility.

## 🚀 Features

### 🔐 Authentication & Security
- **Secure Login System** - Email/password authentication via Supabase Auth
- **Role-Based Access Control (RBAC)** - Admin, HR, Employee, and Manager roles
- **Session Management** - Automatic session handling and logout functionality
- **Row Level Security (RLS)** - Database-level security policies

### 👥 User Management
- **Multi-Role Support**:
  - **Admin**: Full system access, user creation, department management
  - **HR**: Employee data access, profile management, reporting
  - **Employee**: Personal profile management, view-only access
  - **Manager**: Team management, department-level access

### 📊 HR Dashboard
- **Employee Directory** - Complete list of all employees with detailed profiles
- **Real-time Data** - Live employee information with pull-to-refresh
- **Responsive Design** - Optimized for both mobile and web platforms
- **Employee Details**:
  - Personal information (Name, DOB, Nationality)
  - Contact details (Mobile, Email addresses)
  - Professional info (Designation, Department, Role)
  - Document numbers (NID, Passport)
  - Address information
  - Account status and login history

### 🏢 Department Management
- **Department Structure** - Organized employee hierarchy
- **Department-wise Filtering** - View employees by department
- **Role-based Permissions** - Access control based on user roles

### 📱 Cross-Platform Support
- **Mobile Apps** - Native Android and iOS experience
- **Web Application** - Responsive web interface
- **Unified Codebase** - Single codebase for all platforms

## 🛠️ Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **Database**: PostgreSQL with Row Level Security
- **Styling**: React Native StyleSheet

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Git**

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Brikkhobondhon/EcoNest.git
cd EcoNest
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Configuration

#### Create a Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings > API

#### Update Configuration
Edit `src/config/supabase.js` with your credentials:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
```

#### Set Up Database Schema
Run the following SQL scripts in your Supabase SQL Editor in order:

1. **Initial Schema**: `database_schema.sql`
2. **RBAC System**: `rbac_schema_fixed.sql`
3. **Test Data** (optional): `test_add_users.sql`

### 4. Start the Application
```bash
npm start
```

This will start the Expo development server. You can then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

## 👤 Default User Accounts

After running the database setup scripts, you'll have these test accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Admin | admin@econest.com | admin123 | Full system access |
| HR | hr@econest.com | hr123 | Employee management |
| Employee | employee@econest.com | emp123 | Personal profile only |

⚠️ **Security Note**: Change these default passwords in production!

## 📖 Usage Guide

### 🔑 Logging In
1. Open the application
2. Enter your email and password
3. The system will automatically redirect you based on your role:
   - **Admin** → Admin Dashboard
   - **HR** → HR Dashboard with employee list
   - **Employee/Manager** → Employee Dashboard

### 👥 HR Dashboard Features

#### Viewing Employee List
- **Access**: Login as HR user
- **Features**:
  - Scroll through all employees
  - View complete employee profiles
  - See real-time employee count
  - Pull down to refresh data

#### Employee Information Displayed
- **Personal**: Name, Date of Birth, Nationality
- **Contact**: Mobile numbers, Personal/Official emails
- **Professional**: Role, Department, Designation
- **Documents**: NID, Passport numbers
- **Status**: First login status, Account activity

#### Navigation
- **Mobile**: Native touch scrolling
- **Web**: Mouse wheel or scrollbar
- **Refresh**: Pull down to refresh (mobile) or use refresh control

### 🔒 Role-Based Features

#### Admin Capabilities
- Create new employee accounts
- Manage all user roles and permissions
- Access all system features
- Department management
- System configuration

#### HR Capabilities
- View all employee profiles
- Access employee management features
- Generate reports
- Update employee information

#### Employee Capabilities
- View and update personal profile
- Change password
- View department information
- Access personal reports

## 🗂️ Project Structure

```
EcoNest/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase configuration
│   ├── context/
│   │   └── AuthContext.js       # Authentication context
│   ├── navigation/
│   │   └── AppNavigator.js      # Navigation logic
│   └── screens/
│       ├── LoginScreen.js       # Login interface
│       └── HRDashboard.js       # HR Dashboard
├── database_schema.sql          # Initial database schema
├── rbac_schema_fixed.sql        # RBAC implementation
├── test_add_users.sql          # Test data
├── App.js                      # Main application entry
├── package.json                # Dependencies
└── README.md                   # This file
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Configuration
The application uses PostgreSQL with Row Level Security. Key tables:
- **users**: Employee information and credentials
- **user_role**: Role definitions and permissions
- **departments**: Organizational structure
- **user_profiles**: View combining user and role data

## 🚀 Deployment

### Mobile App Deployment
```bash
# Build for Android
expo build:android

# Build for iOS
expo build:ios
```

### Web Deployment
```bash
# Build for web
expo build:web

# The build output will be in the web-build/ directory
```

## 🧪 Testing

### Adding Test Users
Run the `test_add_users.sql` script to add sample employees:
- John Doe (Software Engineer)
- Sarah Wilson (UI/UX Designer)
- Mike Johnson (IT Manager)
- Lisa Anderson (Financial Analyst)
- David Chen (Marketing Specialist)

### Testing Different Roles
1. Login with different user accounts
2. Verify role-based access restrictions
3. Test HR Dashboard functionality
4. Verify mobile and web responsiveness

## 🔒 Security Features

### Authentication Security
- Secure password hashing via Supabase
- JWT token-based authentication
- Automatic session expiration
- Secure logout functionality

### Database Security
- Row Level Security (RLS) policies
- Role-based data access
- SQL injection prevention
- Encrypted data transmission

### Application Security
- Input validation
- XSS protection
- CSRF protection via Supabase
- Secure API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Authors

- **DiptoAc** - *Initial work* - [GitHub Profile](https://github.com/DiptoAc)

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the amazing React Native framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [React Navigation](https://reactnavigation.org/) for navigation solutions

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Brikkhobondhon/EcoNest/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Built with ❤️ using React Native and Supabase** 