# Admin Settings - Department Management

## Overview
The Admin Settings screen provides administrators with the ability to manage departments within the system. This includes creating new departments and deleting existing ones.

## Features

### Department Creation
- **Automatic Code Generation**: Each new department automatically receives a unique 2-digit code (01, 02, 03, etc.)
- **Name Validation**: Department names are required and must be unique
- **Optional Description**: Departments can include an optional description
- **Real-time Preview**: Shows the next available department code before creation

### Department Management
- **List View**: Displays all departments with their codes and descriptions
- **Delete Functionality**: Allows administrators to delete departments (with confirmation)
- **Responsive Design**: Works on both mobile and web platforms

## Database Schema

### Tables Used
1. **departments** - Stores department information
   - `id` (UUID, Primary Key)
   - `name` (VARCHAR, Unique)
   - `description` (TEXT, Optional)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **department_codes** - Stores department codes
   - `id` (UUID, Primary Key)
   - `department_id` (UUID, Foreign Key to departments)
   - `code` (VARCHAR, Unique, 2-digit format)
   - `description` (TEXT, Optional)
   - `is_active` (BOOLEAN, Default: true)

## Navigation

### Access Path
1. Login as an admin user
2. From the Admin Dashboard, click the "⚙️ Settings" button in the header
3. Navigate to the Admin Settings screen

### Navigation Structure
```
Login Screen → Admin Dashboard → Admin Settings
```

## Code Generation Logic

The system automatically generates department codes using the following logic:

1. **First Department**: Receives code "01"
2. **Subsequent Departments**: Receives the next available code (02, 03, 04, etc.)
3. **Code Format**: Always 2 digits with leading zeros
4. **Validation**: Ensures codes are unique and follow the pattern `^[0-9]{2}$`

## Error Handling

### Creation Errors
- **Duplicate Name**: Prevents creation of departments with existing names
- **Database Errors**: Handles connection and constraint violations
- **Validation Errors**: Ensures required fields are provided

### Deletion Errors
- **Confirmation Dialog**: Requires user confirmation before deletion
- **Cascade Deletion**: Properly handles related department codes
- **Error Recovery**: Provides feedback for failed operations

## UI Components

### Main Screen
- **Header**: Navigation back to dashboard
- **Department List**: Scrollable list of existing departments
- **Create Button**: Opens department creation modal

### Creation Modal
- **Name Input**: Required field for department name
- **Description Input**: Optional multi-line text area
- **Code Preview**: Shows the next available code
- **Action Buttons**: Cancel and Create options

### Department Items
- **Department Name**: Primary display text
- **Department Code**: Secondary display with code format
- **Description**: Optional italic text
- **Delete Button**: Red button for department removal

## Styling

### Color Scheme
- **Primary**: #4a90e2 (Blue)
- **Success**: #28a745 (Green)
- **Warning**: #ffc107 (Yellow)
- **Danger**: #dc3545 (Red)
- **Text**: #2c3e50 (Dark Gray)

### Responsive Design
- **Mobile**: Optimized for touch interactions
- **Web**: Enhanced for mouse and keyboard navigation
- **Cross-platform**: Consistent experience across devices

## Testing

### Manual Testing Steps
1. **Create Department**:
   - Navigate to Admin Settings
   - Click "Create Department"
   - Enter department name and description
   - Verify code preview shows correct next code
   - Click Create and verify success message

2. **Delete Department**:
   - Select a department from the list
   - Click Delete button
   - Confirm deletion in dialog
   - Verify department is removed from list

3. **Validation Testing**:
   - Try to create department without name
   - Try to create department with duplicate name
   - Verify appropriate error messages

### Database Testing
Run the provided `test_department_creation.sql` script in your Supabase SQL editor to test the database functionality.

## Future Enhancements

### Potential Features
- **Department Editing**: Modify existing department information
- **Bulk Operations**: Create or delete multiple departments
- **Department Hierarchy**: Support for parent-child department relationships
- **Department Statistics**: Show number of employees per department
- **Import/Export**: CSV import and export functionality

### Technical Improvements
- **Caching**: Implement department list caching for better performance
- **Real-time Updates**: WebSocket integration for live updates
- **Audit Logging**: Track all department changes
- **Advanced Validation**: More sophisticated name and code validation rules 