# Translation Strings Extracted

This document lists all the text strings that have been extracted from the app for translation. The app now uses an i18n system with JSON translation files.

## Translation Files Location
- English: `src/locales/en.json`
- Catalan: `src/locales/ca.json`

## How It Works
The app uses a simple translation function `t()` that takes a key path (e.g., `"common.loading"` or `"buttons.connectWithGoogle"`) and returns the translated string.

## All Translation Keys

### Common
- `common.loading` - "Loading..."
- `common.error` - "Error"
- `common.cancel` - "Cancel"
- `common.save` - "Save"
- `common.delete` - "Delete"
- `common.add` - "Add"
- `common.close` - "Close"
- `common.submit` - "Submit"
- `common.refresh` - "Refresh"
- `common.disconnect` - "Disconnect"
- `common.today` - "Today"
- `common.tomorrow` - "Tomorrow"
- `common.thisWeek` - "This Week"
- `common.later` - "Later"
- `common.upcoming` - "Upcoming"
- `common.noData` - "No data"
- `common.unknown` - "Unknown"

### App
- `app.title` - "Google Classroom Connection"
- `app.subtitle` - "Connect and manage your Google Classroom data"

### Connection
- `connection.connected` - "Connected to Google Classroom"
- `connection.notConnected` - "Not Connected"
- `connection.usingMockData` - "Using Mock Data"

### Buttons
- `buttons.connectWithGoogle` - "Connect with Google"
- `buttons.refreshData` - "Refresh Data"
- `buttons.switchToMockData` - "Switch to Mock Data"
- `buttons.switchToGoogleClassroom` - "Switch to Google Classroom"
- `buttons.reloadMockData` - "Reload Mock Data"
- `buttons.tutorParentView` - "Tutor/Parent View"
- `buttons.studentView` - "Student View"
- `buttons.addCustomTask` - "+ Add Custom Task"
- `buttons.submitAssignment` - "Submit Assignment"
- `buttons.changeCourseColor` - "Change course color"
- `buttons.deleteCustomTask` - "Delete custom task"
- `buttons.deleteSubtask` - "Delete subtask"

### Subtasks
- `subtasks.title` - "Subtasks"
- `subtasks.addSubtask` - "Add subtask"
- `subtasks.close` - "Close"
- `subtasks.enterSubtask` - "Enter subtask..."
- `subtasks.adding` - "Adding..."
- `subtasks.loading` - "Loading subtasks..."
- `subtasks.noSubtasks` - "No subtasks"

### Courses
- `courses.title` - "Courses"
- `courses.loading` - "Loading courses..."
- `courses.noData` - "No data yet. Refresh after connecting to load your courses."
- `courses.noCourseWork` - "No course work found"
- `courses.loadingCourseWork` - "Loading course work..."
- `courses.loadingSubmissions` - "Loading submissions..."
- `courses.noSubmissions` - "No submissions found"
- `courses.section` - "Section"

### Course Work
- `courseWork.due` - "Due"
- `courseWork.status` - "Status"
- `courseWork.notSubmitted` - "Not Submitted"
- `courseWork.submitted` - "Submitted"
- `courseWork.returned` - "Returned"

### Kanban
- `kanban.title` - "Assignment Dashboard"
- `kanban.pending` - "Pending"
- `kanban.inProgress` - "In Progress"
- `kanban.submitted` - "Submitted"
- `kanban.noPending` - "No pending assignments"
- `kanban.noInProgress` - "No in-progress assignments"
- `kanban.noSubmitted` - "No submitted assignments"
- `kanban.submittedConfirmation` - "Submitted"
- `kanban.submittedCheckmark` - "✓ Submitted"
- `kanban.submitting` - "Submitting..."
- `kanban.submittedSuccess` - "Submitted!"

### Due Date
- `dueDate.summary.today` - "Today"
- `dueDate.summary.thisWeek` - "This Week"
- `dueDate.summary.later` - "Later"
- `dueDate.indicator.today` - "Today"
- `dueDate.indicator.thisWeek` - "This Week"
- `dueDate.indicator.later` - "Later"
- `dueDate.badge.dueToday` - "Due Today"
- `dueDate.badge.thisWeek` - "This Week"
- `dueDate.badge.upcoming` - "Upcoming"

### Tutor View
- `tutorView.title` - "Student Progress Dashboard"
- `tutorView.subtitle` - "Quick overview of assignments and progress"
- `tutorView.overallProgress` - "Overall Progress"
- `tutorView.stillWorkingOn` - "Still Working On"
- `tutorView.dueToday` - "Due Today"
- `tutorView.dueThisWeek` - "Due This Week"
- `tutorView.assignments` - "assignments"
- `tutorView.completed` - "completed"
- `tutorView.assignmentsInProgress` - "Assignments in Progress"
- `tutorView.allClear` - "All clear! No assignments in progress right now."
- `tutorView.upcomingDeadlines` - "Upcoming Deadlines"
- `tutorView.greatNews` - "Great news! No upcoming deadlines in the next two weeks."
- `tutorView.recentlySubmittedWork` - "Recently Submitted Work"
- `tutorView.noRecentSubmissions` - "No assignments submitted recently."
- `tutorView.notStartedYet` - "Not started yet"
- `tutorView.currentlyWorking` - "Currently working on this"
- `tutorView.days` - "days"
- `tutorView.day` - "day"
- `tutorView.noDate` - "No date"

### Modals - Add Task
- `modals.addTask.title` - "Add Custom Task"
- `modals.addTask.taskTitle` - "Task Title *"
- `modals.addTask.enterTaskTitle` - "Enter task title..."
- `modals.addTask.course` - "Course"
- `modals.addTask.custom` - "Custom"
- `modals.addTask.customCourseName` - "Custom Course Name"
- `modals.addTask.enterCourseName` - "Enter course name..."
- `modals.addTask.dueDate` - "Due Date"
- `modals.addTask.status` - "Status"
- `modals.addTask.pending` - "Pending"
- `modals.addTask.inProgress` - "In Progress"
- `modals.addTask.submitted` - "Submitted"
- `modals.addTask.creating` - "Creating..."
- `modals.addTask.addTask` - "Add Task"
- `modals.addTask.pleaseEnterTitle` - "Please enter a task title"

### Modals - Course Color
- `modals.courseColor.title` - "Change Color for"
- `modals.courseColor.selectColor` - "Select a color:"
- `modals.courseColor.orEnterCustom` - "Or enter custom color:"
- `modals.courseColor.resetToDefault` - "Reset to Default"
- `modals.courseColor.resetting` - "Resetting..."
- `modals.courseColor.saving` - "Saving..."
- `modals.courseColor.saveColor` - "Save Color"

### Modals - Delete Task
- `modals.deleteTask.confirm` - "Are you sure you want to delete this task? This action cannot be undone."
- `modals.deleteTask.disconnectConfirm` - "Are you sure you want to disconnect and clear all data?"

### Errors
- `errors.failedToCreateTask` - "Failed to create task:"
- `errors.failedToDeleteTask` - "Failed to delete task:"
- `errors.unknownError` - "Unknown error"
- `errors.tryAgain` - "Please try again."

### Status
- `status.PENDING` - "Pending"
- `status.IN_PROGRESS` - "In Progress"
- `status.SUBMITTED` - "Submitted"
- `status.TURNED_IN` - "Submitted"
- `status.RETURNED` - "Returned"
- `status.NEW` - "Not Submitted"

## Current Language Setting

The app is currently set to use **Catalan (ca)** as the default language. This can be changed in `src/i18n.js` by modifying the `currentLanguage` variable, or by calling `setLanguage('en')` or `setLanguage('ca')` from the code.

## Notes

- All user-facing strings have been extracted and are now translatable
- The translation system supports parameter interpolation (though not currently used)
- The language preference is saved in localStorage
- If a translation is missing, the system falls back to English

