# 🌱 EcoNest - Employee Management System

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

## 📖 What is EcoNest?

**EcoNest** is a complete employee management system that helps organizations manage their workforce efficiently. Think of it as a digital HR office where:

- **Employees** can view and update their personal profiles
- **HR staff** can see all employee information at a glance
- **Administrators** can manage the entire system and users
- **Managers** can oversee their team members

The app works on **mobile phones** (Android/iOS) and **web browsers**, so you can access it from anywhere!

## 🚀 Quick Start (5 Minutes Setup)

**New to coding?** Don't worry! Just follow these simple steps:

### Step 1: Install Required Software
You'll need these free tools on your computer:
1. **Node.js** - Download from [nodejs.org](https://nodejs.org) (choose LTS version)
2. **Git** - Download from [git-scm.com](https://git-scm.com)

### Step 2: Get the Code
Open your terminal/command prompt and run:
```bash
git clone https://github.com/Brikkhobondhon/EcoNest.git
cd EcoNest
npm install
```

### Step 3: Set Up the Database
1. Go to [Supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose any name you like)
3. Go to **Settings → API** and copy your **URL** and **anon key**
4. Edit the file `src/config/supabase.js` and paste your credentials

### Step 4: Set Up the Database Tables
In your Supabase dashboard:
1. Go to **SQL Editor**
2. Copy and paste the contents of `database_schema.sql` and run it
3. Copy and paste the contents of `rbac_schema_fixed.sql` and run it
4. Copy and paste the contents of `test_add_users.sql` and run it (this adds sample users)

### Step 5: Set Up Profile Image Storage
For the profile picture feature to work:
1. In your Supabase dashboard, go to **Storage**
2. Click **"Create a new bucket"**
3. Set bucket name as: `profile-images`
4. ✅ Check **"Public bucket"**
5. Click **"Create bucket"**
6. Go to **Storage → Policies** and add these policies:

**Policy 1: Allow Public Read Access**
- Policy Name: `Allow public read access`
- Operation: SELECT
- Target Roles: public
- Policy Definition: `bucket_id = 'profile-images'`

**Policy 2: Allow Authenticated Upload**
- Policy Name: `Allow authenticated uploads`
- Operation: INSERT
- Target Roles: authenticated
- Policy Definition: `bucket_id = 'profile-images'`

**Policy 3: Allow Authenticated Delete**
- Policy Name: `Allow users to delete profile images`
- Operation: DELETE
- Target Roles: authenticated
- Policy Definition: `bucket_id = 'profile-images'`

### Step 6: Start the App
```bash
npm start
```

**That's it!** The app will open in your browser automatically. 🎉

## 🔑 How to Use EcoNest

### First Login
After setup, you can login with these test accounts:

| What You Are | Email | Password | What You Can Do |
|-------------|-------|----------|-----------------|
| **Admin** | admin@econest.com | admin123 | Manage everything |
| **HR Person** | hr@econest.com | hr123 | View all employees |
| **Employee** | employee@econest.com | emp123 | Manage your profile |

⚠️ **Important**: Change these passwords later for security!

### For Employees: Managing Your Profile

1. **Login** with your employee credentials
2. **View Your Info** - See all your personal details and profile picture
3. **Edit Your Profile** - Click "Edit Profile" to update:
   - Your name and personal details
   - Phone numbers and email addresses
   - Home address
   - ID numbers (NID, Passport)
   - **Profile Picture** - Upload your photo (up to 1MB)
4. **Upload Profile Picture**:
   - Click "Edit Profile" → Scroll to "Personal Information"
   - Click "Change Photo" button
   - Select an image from your device (JPG, PNG, GIF, WebP supported)
   - Image will be automatically cropped to square format
   - Your old profile picture is automatically deleted to save storage space
5. **Save Changes** - Your updates are saved automatically
6. **Logout** - Use the logout button when done

**What You Can't Change**: Your role, department, and work designation (only HR/Admin can change these)

**Profile Picture Tips**:
- ✅ Keep images under 1MB in size
- ✅ Square images work best (1:1 aspect ratio)
- ✅ High-quality photos look better
- ⚠️ Old pictures are automatically deleted when you upload new ones

### For HR Staff: Managing Employees

1. **Login** with HR credentials
2. **View Employee List** - See all employees in the company
3. **Search Employees** - Use the search box to find specific people
4. **View Details** - Tap/click on any employee to see their complete profile
5. **Navigate** - Scroll through the list (works on mobile and web)
6. **Refresh** - Pull down to refresh the list

**What You Can See**: All employee information, contact details, roles, and departments

### For Administrators: Full Control

1. **Login** with admin credentials
2. **Manage All Users** - Create, edit, or remove user accounts
3. **Assign Roles** - Set who is HR, Employee, Manager, or Admin
4. **Department Management** - Organize company structure
5. **System Settings** - Configure the entire system

## 📱 Using on Different Devices

### On Your Phone
- **Download Expo Go** app from your app store
- **Scan the QR code** that appears when you run `npm start`
- **Use naturally** - tap, scroll, and navigate like any mobile app

### On Your Computer
- **Open your browser** - The app opens automatically at `http://localhost:19006`
- **Use your mouse** - Click buttons, scroll with mouse wheel
- **Resize window** - The app adjusts to your screen size

### On Tablets
- Works great on both iPad and Android tablets
- Responsive design adapts to your screen size

## 🔧 Common Issues & Solutions

### Problem: "Module not found" errors
**Solution**: Make sure you installed dependencies:
```bash
npm install
```

### Problem: Can't connect to database
**Solution**: 
1. Check your internet connection
2. Verify your Supabase credentials in `src/config/supabase.js`
3. Make sure you ran the database setup scripts

### Problem: App won't start
**Solution**: 
1. Make sure Node.js is installed: `node --version`
2. Try clearing cache: `npm start -- --clear`
3. Restart your terminal and try again

### Problem: Can't login
**Solution**:
1. Make sure you ran `test_add_users.sql` to create test accounts
2. Check your email/password (they're case-sensitive)
3. Try refreshing the page

### Problem: List won't scroll on web
**Solution**: This is fixed! The latest version includes proper scrolling for web browsers.

### Problem: Profile picture won't upload
**Solution**: 
1. Check your internet connection
2. Make sure the image is under 1MB in size
3. Try a different image format (JPG, PNG work best)
4. Verify the Supabase storage bucket 'profile-images' exists and is public
5. Check storage policies are properly configured

### Problem: Profile picture shows broken image
**Solution**:
1. The image file might be corrupted - try uploading a different image
2. Clear your browser cache and refresh the page
3. Check if the Supabase storage bucket has the correct public access policies

### Problem: Old profile pictures not being deleted
**Solution**:
1. Verify the DELETE storage policy is configured: `bucket_id = 'profile-images'`
2. Make sure the policy target role is set to 'authenticated'
3. Check the browser console for any deletion error messages

## 🌟 Key Features Explained

### 🔐 **Security & Privacy**
- **Secure Login**: Your passwords are encrypted and safe
- **Role-Based Access**: You only see what you're supposed to see
- **Data Protection**: All information is stored securely in the cloud

### 📊 **Employee Management**
- **Complete Profiles**: Store all employee information in one place
- **Profile Pictures**: Upload and display employee photos with automatic cleanup
- **Real-Time Updates**: Changes are saved instantly
- **Search & Filter**: Find employees quickly
- **Mobile & Web**: Access from anywhere
- **Smart Storage**: Automatic deletion of old images saves storage space

### 🎯 **User-Friendly Design**
- **Simple Interface**: Easy to use, even for non-tech people
- **Responsive**: Works on phones, tablets, and computers
- **Fast**: Quick loading and smooth navigation
- **Intuitive**: Logical flow and clear buttons

## 🏗️ System Requirements

### For Users (Running the App)
- **Internet connection** (for database access)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **Or smartphone** with Expo Go app
- **Camera/Photo library access** (for profile picture uploads)

### For Developers (Setting Up)
- **Node.js** version 16 or higher
- **npm** (comes with Node.js)
- **Git** for version control
- **Code editor** (VS Code recommended)

## 🚀 Advanced Setup (For Developers)

### Environment Variables
Create a `.env` file in your project root:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Schema
The app uses these main tables:
- **users**: Employee accounts and credentials
- **user_role**: Role definitions (Admin, HR, Employee, Manager)
- **departments**: Company organizational structure
- **user_profiles**: Combined view of user and role data

### Building for Production
```bash
# For Android
expo build:android

# For iOS  
expo build:ios

# For Web
expo build:web
```

## 📂 Project Structure

```
EcoNest/
├── src/
│   ├── config/
│   │   └── supabase.js          # Database connection
│   ├── context/
│   │   └── AuthContext.js       # User authentication
│   ├── navigation/
│   │   └── AppNavigator.js      # App navigation
│   └── screens/
│       ├── LoginScreen.js       # Login page
│       ├── HRDashboard.js       # HR employee list
│       ├── EmployeeDashboard.js # Employee profile with image upload
│       └── AdminDashboard.js    # Admin user management
├── database_schema.sql          # Database setup
├── rbac_schema_fixed.sql        # Security setup
├── test_add_users.sql          # Sample data
├── App.js                      # Main app file
└── package.json                # Dependencies
```

## 🤝 Getting Help

### If You're Stuck
1. **Check this README** - Most answers are here
2. **Look at Issues** - [GitHub Issues](https://github.com/Brikkhobondhon/EcoNest/issues)
3. **Ask for Help** - Create a new issue with your problem
4. **Contact Support** - Reach out to the development team

### For Developers
- **Contributing Guide**: Fork → Branch → Commit → Push → Pull Request
- **Code Standards**: TypeScript, React Native best practices
- **Testing**: Test on both mobile and web before submitting

## 🔒 Security & Privacy

### Your Data is Safe
- **Encrypted Storage**: All data is encrypted in the database
- **Secure Transmission**: HTTPS for all communications
- **Access Control**: Role-based permissions protect sensitive information
- **Regular Backups**: Your data is backed up automatically
- **Secure Image Storage**: Profile pictures stored in secure cloud storage with proper access controls

### Privacy Policy
- **Data Collection**: We only collect necessary employee information
- **Data Usage**: Used only for employee management purposes
- **Data Sharing**: Not shared with third parties
- **Data Control**: You control your own profile information
- **Image Privacy**: Profile pictures are only visible to authenticated users

## 📞 Support & Contact

### Technical Support
- **Email**: [Create an issue](https://github.com/Brikkhobondhon/EcoNest/issues)
- **Documentation**: This README file
- **Community**: GitHub Discussions

### Development Team
- **Lead Developer**: [DiptoAc](https://github.com/DiptoAc)
- **Contributors**: See [Contributors](https://github.com/Brikkhobondhon/EcoNest/graphs/contributors)

## 🎉 Success Stories

### What Users Say
*"EcoNest made our HR processes so much easier. Now employees can update their own information!"*

*"The web and mobile versions work perfectly. I can access employee data from anywhere."*

*"Setup was surprisingly easy, even for someone who's not very technical."*

*"The profile picture feature makes it much easier to recognize employees in our system!"*

## 🔄 Recent Updates

### ✅ Latest Improvements
- **Profile Picture Upload**: Employees can now upload and manage their profile photos
- **Automatic Image Cleanup**: Old profile pictures are automatically deleted to save storage space
- **Cross-Platform Image Support**: Upload works seamlessly on both web and mobile devices
- **Smart File Validation**: 1MB size limit with multiple format support (JPG, PNG, GIF, WebP)
- **Cache-Busting Technology**: Prevents browser caching issues with updated images
- **Fixed Web Scrolling**: Employee lists now scroll properly on web browsers
- **Enhanced Mobile Experience**: Better touch navigation and responsive design
- **Improved Security**: Updated authentication and data protection
- **Better User Experience**: Smoother navigation and faster loading

### 🚀 Coming Soon
- **Advanced Search**: Filter by department, role, and other criteria
- **Bulk Operations**: Update multiple employees at once
- **Reporting**: Generate employee reports and statistics
- **Email Notifications**: Automated notifications for profile updates
- **Image Compression**: Automatic optimization of uploaded photos

---

## 🏆 Why Choose EcoNest?

### ✅ **Easy to Use**
- Simple interface anyone can understand
- Works on any device
- No technical knowledge required
- Intuitive profile picture upload

### ✅ **Secure & Reliable**
- Enterprise-grade security
- Cloud-based reliability
- Regular automatic backups
- Secure image storage with proper access controls

### ✅ **Cost-Effective**
- Open source and free
- No licensing fees
- Minimal hosting costs
- Automatic storage optimization

### ✅ **Scalable**
- Works for small teams or large companies
- Add unlimited employees
- Grows with your business
- Efficient storage management

---

**Built with ❤️ using React Native, Expo, and Supabase** 

*Ready to get started? Jump to the [Quick Start](#-quick-start-5-minutes-setup) section above!*