import { useEffect, useState } from "react";
import "./App.css";

export const mockCourses = [
  {
    id: "course_math",
    name: "Mathematics",
    color: "#2563eb",
  },
  {
    id: "course_history",
    name: "History",
    color: "#9333ea",
  },
  {
    id: "course_english",
    name: "English",
    color: "#15803d",
  },
];

export const mockAssignments = [
  {
    id: "a1",
    courseId: "course_math",
    courseName: "Mathematics",
    title: "Fractions worksheet",
    dueText: "Tomorrow",
    dueDate: "2026-01-12",
    status: "PENDING",
  },
  {
    id: "a2",
    courseId: "course_math",
    courseName: "Mathematics",
    title: "Practice exercises – decimals",
    dueText: "In 3 days",
    dueDate: "2026-01-15",
    status: "IN_PROGRESS",
  },
  {
    id: "a3",
    courseId: "course_history",
    courseName: "History",
    title: "Short essay: Roman Empire",
    dueText: "Friday",
    dueDate: "2026-01-14",
    status: "PENDING",
  },
  {
    id: "a4",
    courseId: "course_english",
    courseName: "English",
    title: "Reading comprehension submission",
    dueText: "Submitted",
    dueDate: "2026-01-09",
    status: "SUBMITTED",
  },
];

export default function App() {
  const [me, setMe] = useState(null);
  const [courses, setCourses] = useState(null);
  const [courseWork, setCourseWork] = useState({}); // { courseId: { data: [], loading: false } }
  const [submissions, setSubmissions] = useState({}); // { "courseId-workId": { data: [], loading: false } }
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedCourseWork, setExpandedCourseWork] = useState(new Set());
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [recentlySubmitted, setRecentlySubmitted] = useState(new Set()); // Track IDs of recently submitted assignments
  const [mockAssignmentsState, setMockAssignmentsState] = useState([...mockAssignments]);
  const [viewMode, setViewMode] = useState("student"); // "student" or "tutor"

  function loadMockData() {
    setErr("");
    setLoading(true);
    try {
      // Set mock user
      setMe({ name: "Test User", email: "test@example.com" });
      
      // Set mock courses
      setCourses({ courses: mockCourses });
      
      // Reset mock assignments state
      setMockAssignmentsState([...mockAssignments]);
      
      // Pre-load course work for all courses from mock assignments
      const courseWorkData = {};
      mockCourses.forEach(course => {
        const assignments = mockAssignments.filter(a => a.courseId === course.id);
        courseWorkData[course.id] = {
          data: assignments.map(assignment => ({
            id: assignment.id,
            title: assignment.title,
            dueDate: assignment.dueDate,
            dueText: assignment.dueText,
            status: assignment.status,
            courseName: assignment.courseName,
          })),
          loading: false
        };
      });
      setCourseWork(courseWorkData);
      
      setUseMockData(true);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const meRes = await fetch("http://localhost:4000/api/me");
      const meJson = await meRes.json();
      if (!meRes.ok) throw new Error(JSON.stringify(meJson));

      const cRes = await fetch("http://localhost:4000/api/courses");
      const cJson = await cRes.json();
      if (!cRes.ok) throw new Error(JSON.stringify(cJson));

      setMe(meJson);
      setCourses(cJson);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCourseWork(courseId) {
    if (courseWork[courseId]?.data) return; // Already loaded
    
    // Use mock data if enabled
    if (useMockData) {
      const assignments = mockAssignmentsState.filter(a => a.courseId === courseId);
      setCourseWork(prev => ({
        ...prev,
        [courseId]: {
          data: assignments.map(assignment => ({
            id: assignment.id,
            title: assignment.title,
            dueDate: assignment.dueDate,
            dueText: assignment.dueText,
            status: assignment.status,
            courseName: assignment.courseName,
          })),
          loading: false
        }
      }));
      return;
    }
    
    setCourseWork(prev => ({
      ...prev,
      [courseId]: { ...prev[courseId], loading: true }
    }));

    try {
      const res = await fetch(`http://localhost:4000/api/courses/${courseId}/courseWork`);
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));

      setCourseWork(prev => ({
        ...prev,
        [courseId]: { data: json.courseWork || [], loading: false }
      }));
    } catch (e) {
      setCourseWork(prev => ({
        ...prev,
        [courseId]: { data: null, loading: false, error: String(e.message || e) }
      }));
    }
  }

  async function loadSubmissions(courseId, workId) {
    const key = `${courseId}-${workId}`;
    if (submissions[key]?.data) return; // Already loaded

    // Use mock data if enabled
    if (useMockData) {
      const assignment = mockAssignmentsState.find(a => a.id === workId && a.courseId === courseId);
      if (assignment) {
        setSubmissions(prev => ({
          ...prev,
          [key]: {
            data: [{
              id: assignment.id,
              assignmentId: assignment.id,
              state: assignment.status,
              status: assignment.status,
              dueDate: assignment.dueDate,
              dueText: assignment.dueText,
              title: assignment.title,
            }],
            loading: false
          }
        }));
      }
      return;
    }

    setSubmissions(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true }
    }));

    try {
      const res = await fetch(`http://localhost:4000/api/courses/${courseId}/courseWork/${workId}/submissions`);
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json));

      setSubmissions(prev => ({
        ...prev,
        [key]: { data: json.studentSubmissions || [], loading: false }
      }));
    } catch (e) {
      setSubmissions(prev => ({
        ...prev,
        [key]: { data: null, loading: false, error: String(e.message || e) }
      }));
    }
  }

  function toggleCourse(courseId) {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
      loadCourseWork(courseId);
    }
    setExpandedCourses(newExpanded);
  }

  function toggleCourseWork(courseId, workId) {
    const key = `${courseId}-${workId}`;
    const newExpanded = new Set(expandedCourseWork);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
      loadSubmissions(courseId, workId);
    }
    setExpandedCourseWork(newExpanded);
  }

  // Function to submit an assignment
  function handleSubmitAssignment(taskId) {
    if (useMockData) {
      // Update mock assignments state
      const updatedAssignments = mockAssignmentsState.map(assignment => 
        assignment.id === taskId 
          ? { ...assignment, status: "SUBMITTED", dueText: "Submitted" }
          : assignment
      );
      setMockAssignmentsState(updatedAssignments);
      
      // Also update courseWork state to keep it in sync
      setCourseWork(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(courseId => {
          if (updated[courseId]?.data) {
            updated[courseId] = {
              ...updated[courseId],
              data: updated[courseId].data.map(assignment =>
                assignment.id === taskId
                  ? { ...assignment, status: "SUBMITTED", dueText: "Submitted" }
                  : assignment
              )
            };
          }
        });
        return updated;
      });
    } else {
      // Update courseWork state for real data
      setCourseWork(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(courseId => {
          if (updated[courseId]?.data) {
            updated[courseId] = {
              ...updated[courseId],
              data: updated[courseId].data.map(assignment =>
                assignment.id === taskId
                  ? { ...assignment, status: "SUBMITTED", dueText: "Submitted" }
                  : assignment
              )
            };
          }
        });
        return updated;
      });
    }
    
    // Add to recently submitted set to show checkmark
    setRecentlySubmitted(prev => new Set(prev).add(taskId));
    
    // Remove from recently submitted after animation (3 seconds)
    setTimeout(() => {
      setRecentlySubmitted(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }, 3000);
  }

  // Helper function to get all assignments from courseWork state
  function getAllAssignments() {
    const allAssignments = [];
    
    if (useMockData) {
      // If using mock data, return mock assignments state directly
      return mockAssignmentsState.map(assignment => ({
        id: assignment.id,
        courseId: assignment.courseId,
        courseName: assignment.courseName,
        title: assignment.title,
        dueDate: assignment.dueDate,
        dueText: assignment.dueText,
        status: assignment.status,
      }));
    }
    
    // Collect all assignments from courseWork state
    Object.keys(courseWork).forEach(courseId => {
      const work = courseWork[courseId];
      if (work?.data && Array.isArray(work.data)) {
        work.data.forEach(assignment => {
          const course = courses?.courses?.find(c => c.id === courseId);
          allAssignments.push({
            id: assignment.id,
            courseId: courseId,
            courseName: assignment.courseName || course?.name || 'Unknown Course',
            title: assignment.title,
            dueDate: assignment.dueDate,
            dueText: assignment.dueText,
            status: assignment.status,
          });
        });
      }
    });
    
    return allAssignments;
  }

  // Helper function to calculate luminance for contrast
  function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Helper function to convert hex to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Helper function to get course color
  function getCourseColor(courseId) {
    // Try mock courses first
    const mockCourse = mockCourses.find(c => c.id === courseId);
    if (mockCourse?.color) return mockCourse.color;
    
    // Try courses from state
    const course = courses?.courses?.find(c => c.id === courseId);
    if (course?.color) return course.color;
    
    // Default color (dark gray for high contrast)
    return '#1f2937';
  }

  // Helper function to get text color based on background (high contrast)
  function getTextColorForBackground(bgColor) {
    const luminance = getLuminance(bgColor);
    // Use white text for dark backgrounds, black text for light backgrounds
    // Threshold of 0.179 for WCAG AA contrast (4.5:1)
    return luminance > 0.179 ? '#000000' : '#ffffff';
  }

  // Helper functions for filtering assignments by status (Kanban columns)
  const getAllTasksByStatus = (status) => {
    const allTasks = getAllAssignments();
    return allTasks.filter((t) => t.status === status);
  };

  // Helper function to parse due date (handles both string and object formats)
  function parseDueDate(dueDate) {
    if (!dueDate) return null;
    
    if (typeof dueDate === 'string') {
      return new Date(dueDate);
    } else if (dueDate.year && dueDate.month && dueDate.day) {
      return new Date(dueDate.year, dueDate.month - 1, dueDate.day);
    }
    
    return null;
  }

  // Helper function to categorize due date (Today, This Week, Later)
  function getDueDateCategory(dueDate) {
    if (!dueDate) return null;
    
    const date = parseDueDate(dueDate);
    if (!date) return null;
    
    // Skip if already submitted
    // We'll filter by status in the calling code
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDateOnly = new Date(date);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((dueDateOnly - today) / (1000 * 60 * 60 * 24));
    
    // Calculate days until end of this week (Sunday)
    const dayOfWeek = today.getDay();
    // If today is Sunday (0), this week ends today (0 days)
    // Otherwise, count days until Sunday (7 - dayOfWeek)
    const daysUntilEndOfWeek = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    
    if (daysDiff === 0) {
      return 'today';
    } else if (daysDiff > 0 && daysDiff <= daysUntilEndOfWeek) {
      return 'thisWeek';
    } else {
      return 'later';
    }
  }

  // Helper function to get assignments by due date category
  function getAssignmentsByDueCategory(category) {
    const allTasks = getAllAssignments();
    return allTasks.filter(task => {
      if (task.status === 'SUBMITTED') return false; // Don't count submitted assignments
      return getDueDateCategory(task.dueDate) === category;
    });
  }

  // Helper functions for Tutor/Parent View
  function getPendingAssignments() {
    const allTasks = getAllAssignments();
    return allTasks
      .filter(task => task.status === 'PENDING' || task.status === 'IN_PROGRESS')
      .sort((a, b) => {
        const dateA = parseDueDate(a.dueDate);
        const dateB = parseDueDate(b.dueDate);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      });
  }

  function getUpcomingDeadlines() {
    const allTasks = getAllAssignments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get assignments due in the next 14 days
    const next14Days = new Date(today);
    next14Days.setDate(next14Days.getDate() + 14);
    
    return allTasks
      .filter(task => {
        if (task.status === 'SUBMITTED') return false;
        const dueDate = parseDueDate(task.dueDate);
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= next14Days;
      })
      .sort((a, b) => {
        const dateA = parseDueDate(a.dueDate);
        const dateB = parseDueDate(b.dueDate);
        return dateA - dateB;
      });
  }

  function getRecentlySubmittedWork() {
    const allTasks = getAllAssignments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get assignments submitted in the last 7 days
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    
    return allTasks
      .filter(task => {
        if (task.status !== 'SUBMITTED') return false;
        // For submitted work, we'll use the due date as a proxy for submission date
        // In a real app, you'd have actual submission dates
        const dueDate = parseDueDate(task.dueDate);
        if (!dueDate) return true; // Include if no date
        dueDate.setHours(0, 0, 0, 0);
        // Consider recently submitted if due date was recent (within last 7 days)
        return dueDate >= last7Days;
      })
      .sort((a, b) => {
        const dateA = parseDueDate(a.dueDate);
        const dateB = parseDueDate(b.dueDate);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA; // Most recent first
      })
      .slice(0, 10); // Limit to 10 most recent
  }

  // Helper function to get summary statistics for dashboard
  function getProgressSummary() {
    const allTasks = getAllAssignments();
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'SUBMITTED').length;
    const pending = allTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Count assignments due today
    const dueToday = allTasks.filter(t => {
      if (t.status === 'SUBMITTED') return false;
      return getDueDateCategory(t.dueDate) === 'today';
    }).length;
    
    // Count assignments due this week
    const dueThisWeek = allTasks.filter(t => {
      if (t.status === 'SUBMITTED') return false;
      const category = getDueDateCategory(t.dueDate);
      return category === 'today' || category === 'thisWeek';
    }).length;
    
    return {
      total,
      completed,
      pending,
      progressPercent,
      dueToday,
      dueThisWeek
    };
  }

  useEffect(() => {
    const connected = new URLSearchParams(window.location.search).get("connected");
    if (connected) load();
  }, []);

  // Helper function to get user initials
  function getUserInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  // Helper function to get user name
  function getUserName() {
    if (useMockData && !me) {
      return "Test User";
    }
    return me?.name || "Guest";
  }

  // Helper function to get profile picture URL
  function getProfilePictureUrl() {
    if (me?.photoUrl) {
      return me.photoUrl;
    }
    return null;
  }

  return (
    <div className="app-container">
      {/* Top Bar with Profile Card */}
      {(me || useMockData) && (
        <div className="top-bar">
          <div className="top-bar-content">
            <div className="top-bar-left">
              <h1 className="top-bar-title">Google Classroom Connection</h1>
            </div>
            <div className="top-bar-right">
              <div className="profile-card">
                {getProfilePictureUrl() ? (
                  <img 
                    src={getProfilePictureUrl()} 
                    alt={getUserName()}
                    className="profile-picture"
                  />
                ) : (
                  <div className="profile-picture profile-picture-initials">
                    {getUserInitials(getUserName())}
                  </div>
                )}
                <span className="profile-name">{getUserName()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="app-header">
        <h1 className="app-title">Google Classroom Connection</h1>
        <p className="app-subtitle">Connect and manage your Google Classroom data</p>
      </div>

      <div className="action-buttons">
        <a
          href="http://localhost:4000/auth/google"
          className="btn btn-primary"
          disabled={loading}
        >
          Connect with Google
        </a>

        <button
          onClick={loadMockData}
          className="btn btn-secondary"
          disabled={loading}
        >
          Load Mock Data
        </button>

        <button
          onClick={load}
          className="btn btn-secondary"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh Data"}
        </button>

        {(me || useMockData) && (
          <button
            onClick={() => setViewMode(viewMode === "student" ? "tutor" : "student")}
            className={`btn ${viewMode === "tutor" ? "btn-primary" : "btn-secondary"}`}
          >
            {viewMode === "student" ? "Tutor/Parent View" : "Student View"}
          </button>
        )}
      </div>

      {err && (
        <div className="error-message">
          <div>
            <strong>Error:</strong> {err}
          </div>
        </div>
      )}

      {viewMode === "tutor" && (me || useMockData) ? (
        /* Tutor/Parent View */
        <div className="tutor-view">
          <div className="tutor-view-header">
            <h2 className="tutor-view-title">Student Progress Dashboard</h2>
            <p className="tutor-view-subtitle">Quick overview of assignments and progress</p>
          </div>

          {/* Summary Dashboard */}
          {(() => {
            const summary = getProgressSummary();
            return (
              <div className="tutor-summary-dashboard">
                <div className="tutor-summary-card tutor-summary-progress">
                  <div className="tutor-summary-icon">📊</div>
                  <div className="tutor-summary-content">
                    <div className="tutor-summary-label">Overall Progress</div>
                    <div className="tutor-summary-value-large">{summary.progressPercent}%</div>
                    <div className="tutor-progress-bar">
                      <div 
                        className="tutor-progress-fill" 
                        style={{ width: `${summary.progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="tutor-summary-sublabel">{summary.completed} of {summary.total} completed</div>
                  </div>
                </div>

                <div className="tutor-summary-card tutor-summary-pending">
                  <div className="tutor-summary-icon">📝</div>
                  <div className="tutor-summary-content">
                    <div className="tutor-summary-label">Still Working On</div>
                    <div className="tutor-summary-value">{summary.pending}</div>
                    <div className="tutor-summary-sublabel">assignments</div>
                  </div>
                </div>

                <div className="tutor-summary-card tutor-summary-due-today">
                  <div className="tutor-summary-icon">⏰</div>
                  <div className="tutor-summary-content">
                    <div className="tutor-summary-label">Due Today</div>
                    <div className="tutor-summary-value">{summary.dueToday}</div>
                    <div className="tutor-summary-sublabel">assignments</div>
                  </div>
                </div>

                <div className="tutor-summary-card tutor-summary-due-week">
                  <div className="tutor-summary-icon">📅</div>
                  <div className="tutor-summary-content">
                    <div className="tutor-summary-label">Due This Week</div>
                    <div className="tutor-summary-value">{summary.dueThisWeek}</div>
                    <div className="tutor-summary-sublabel">assignments</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Assignments in Progress */}
          <div className="tutor-section">
            <div className="tutor-section-header">
              <h3 className="tutor-section-title">Assignments in Progress</h3>
              <span className="tutor-section-badge">{getPendingAssignments().length}</span>
            </div>
            <div className="tutor-section-content">
              {getPendingAssignments().length > 0 ? (
                <div className="tutor-assignment-list">
                  {getPendingAssignments().map((task) => (
                    <div key={task.id} className="tutor-assignment-item">
                      <div className="tutor-assignment-header">
                        <span 
                          className="tutor-course-badge" 
                          style={{ 
                            backgroundColor: getCourseColor(task.courseId),
                            color: getTextColorForBackground(getCourseColor(task.courseId)),
                            borderColor: getCourseColor(task.courseId)
                          }}
                        >
                          {task.courseName}
                        </span>
                        {getDueDateCategory(task.dueDate) && (
                          <span className={`tutor-due-badge tutor-due-${getDueDateCategory(task.dueDate)}`}>
                            {getDueDateCategory(task.dueDate) === 'today' ? 'Due Today' : 
                             getDueDateCategory(task.dueDate) === 'thisWeek' ? 'This Week' : 
                             'Upcoming'}
                          </span>
                        )}
                      </div>
                      <div className="tutor-assignment-body">
                        <h4 className="tutor-assignment-title">{task.title}</h4>
                        {task.dueText && (
                          <div className="tutor-assignment-due">
                            Due: {task.dueText}
                          </div>
                        )}
                        {task.dueDate && !task.dueText && (
                          <div className="tutor-assignment-due">
                            Due: {typeof task.dueDate === 'string' 
                              ? new Date(task.dueDate).toLocaleDateString()
                              : new Date(task.dueDate.year, task.dueDate.month - 1, task.dueDate.day).toLocaleDateString()}
                          </div>
                        )}
                        <div className="tutor-assignment-status">
                          {task.status === 'PENDING' ? 'Not started yet' : 'Currently working on this'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tutor-empty-state">All clear! No assignments in progress right now.</div>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="tutor-section">
            <div className="tutor-section-header">
              <h3 className="tutor-section-title">Upcoming Deadlines</h3>
              <span className="tutor-section-badge">{getUpcomingDeadlines().length}</span>
            </div>
            <div className="tutor-section-content">
              {getUpcomingDeadlines().length > 0 ? (
                <div className="tutor-deadline-list">
                  {getUpcomingDeadlines().map((task) => {
                    const dueDate = parseDueDate(task.dueDate);
                    const daysUntil = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <div key={task.id} className="tutor-deadline-item">
                        <div className="tutor-deadline-date">
                          {dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                          {daysUntil !== null && (
                            <span className="tutor-deadline-days">
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </span>
                          )}
                        </div>
                        <div className="tutor-deadline-content">
                          <h4 className="tutor-deadline-title">{task.title}</h4>
                          <span className="tutor-deadline-course" style={{ color: getCourseColor(task.courseId) }}>
                            {task.courseName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="tutor-empty-state">Great news! No upcoming deadlines in the next two weeks.</div>
              )}
            </div>
          </div>

          {/* Recently Submitted Work */}
          <div className="tutor-section">
            <div className="tutor-section-header">
              <h3 className="tutor-section-title">Recently Submitted Work</h3>
              <span className="tutor-section-badge">{getRecentlySubmittedWork().length}</span>
            </div>
            <div className="tutor-section-content">
              {getRecentlySubmittedWork().length > 0 ? (
                <div className="tutor-submitted-list">
                  {getRecentlySubmittedWork().map((task) => (
                    <div key={task.id} className="tutor-submitted-item">
                      <div className="tutor-submitted-icon">✓</div>
                      <div className="tutor-submitted-content">
                        <h4 className="tutor-submitted-title">{task.title}</h4>
                        <div className="tutor-submitted-meta">
                          <span className="tutor-submitted-course" style={{ color: getCourseColor(task.courseId) }}>
                            {task.courseName}
                          </span>
                          {task.dueText && (
                            <span className="tutor-submitted-due">Due: {task.dueText}</span>
                          )}
                          {task.dueDate && !task.dueText && (
                            <span className="tutor-submitted-due">
                              Due: {typeof task.dueDate === 'string' 
                                ? new Date(task.dueDate).toLocaleDateString()
                                : new Date(task.dueDate.year, task.dueDate.month - 1, task.dueDate.day).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tutor-empty-state">No assignments submitted recently.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Student View */
        <>
      <div className="data-card">
        <div className="card-header">
          <h3 className="card-title">
            Courses
            {courses?.courses && Array.isArray(courses.courses) && (
              <span className="badge">{courses.courses.length}</span>
            )}
          </h3>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="card-loading">
              <div className="spinner"></div>
              <p className="loading-text">Loading courses...</p>
            </div>
          ) : courses?.courses && Array.isArray(courses.courses) ? (
            <div className="courses-list">
              {courses.courses.map((course) => (
                <div key={course.id} className="course-item">
                  <div 
                    className="course-header" 
                    onClick={() => toggleCourse(course.id)}
                  >
                    <div className="course-info">
                      <div className="course-name">
                        {expandedCourses.has(course.id) ? '▼ ' : '▶ '}
                        {course.name || `Course ${course.id}`}
                      </div>
                      {course.section && <div className="course-section">{course.section}</div>}
                    </div>
                    {courseWork[course.id]?.data && (
                      <span className="badge badge-small">
                        {courseWork[course.id].data.length}
                      </span>
                    )}
                  </div>
                  {expandedCourses.has(course.id) && (
                    <div className="course-work-container">
                      {courseWork[course.id]?.loading ? (
                        <div className="nested-loading">
                          <span>Loading course work...</span>
                        </div>
                      ) : courseWork[course.id]?.error ? (
                        <div className="nested-error">Error: {courseWork[course.id].error}</div>
                      ) : courseWork[course.id]?.data && courseWork[course.id].data.length > 0 ? (
                        <div className="course-work-list">
                          {courseWork[course.id].data.map((work) => (
                            <div key={work.id} className="course-work-item">
                              <div 
                                className="course-work-header"
                                onClick={() => toggleCourseWork(course.id, work.id)}
                              >
                                <div className="course-work-info">
                                  <div className="course-work-title">
                                    {expandedCourseWork.has(`${course.id}-${work.id}`) ? '▼ ' : '▶ '}
                                    {work.title || `Work ${work.id}`}
                                  </div>
                                  {work.dueText && (
                                    <div className="course-work-meta">
                                      {work.dueText}
                                    </div>
                                  )}
                                  {work.dueDate && !work.dueText && (
                                    <div className="course-work-meta">
                                      Due: {typeof work.dueDate === 'string' 
                                        ? new Date(work.dueDate).toLocaleDateString()
                                        : new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day).toLocaleDateString()}
                                    </div>
                                  )}
                                  {work.status && (
                                    <div className="course-work-status">
                                      {work.status}
                                    </div>
                                  )}
                                </div>
                                {submissions[`${course.id}-${work.id}`]?.data && (
                                  <span className="badge badge-small">
                                    {submissions[`${course.id}-${work.id}`].data.length}
                                  </span>
                                )}
                              </div>
                              {expandedCourseWork.has(`${course.id}-${work.id}`) && (
                                <div className="submissions-container">
                                  {submissions[`${course.id}-${work.id}`]?.loading ? (
                                    <div className="nested-loading">
                                      <span>Loading submissions...</span>
                                    </div>
                                  ) : submissions[`${course.id}-${work.id}`]?.error ? (
                                    <div className="nested-error">
                                      Error: {submissions[`${course.id}-${work.id}`].error}
                                    </div>
                                  ) : submissions[`${course.id}-${work.id}`]?.data && submissions[`${course.id}-${work.id}`].data.length > 0 ? (
                                    <div className="submissions-info">
                                      {submissions[`${course.id}-${work.id}`].data.map((submission, idx) => {
                                        const status = submission.state === 'SUBMITTED' || submission.state === 'TURNED_IN' ? 'Submitted' : 
                                                       submission.state === 'RETURNED' ? 'Returned' :
                                                       submission.state === 'NEW' ? 'Not Submitted' :
                                                       submission.state || submission.status || 'Unknown';
                                        return (
                                          <div key={submission.id || idx} className="submission-item">
                                            <div className="submission-status">
                                              <strong>Status:</strong> {status}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="nested-empty">No submissions found</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="nested-empty">No course work found</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No data yet. Refresh after connecting to load your courses.</p>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {((useMockData && mockAssignments.length > 0) || (getAllAssignments().length > 0 && (!courses || !courses.courses || courses.courses.length > 0))) && (
        <div className="data-card kanban-card">
          <div className="card-header">
            <h3 className="card-title">
              Assignment Dashboard
            </h3>
          </div>
          
          {/* Due Date Awareness Summary */}
          <div className="due-date-summary">
            <div className="due-date-summary-item">
              <span className="due-date-badge due-date-today">Today</span>
              <span className="due-date-count">{getAssignmentsByDueCategory('today').length}</span>
            </div>
            <div className="due-date-summary-item">
              <span className="due-date-badge due-date-week">This Week</span>
              <span className="due-date-count">{getAssignmentsByDueCategory('thisWeek').length}</span>
            </div>
            <div className="due-date-summary-item">
              <span className="due-date-badge due-date-later">Later</span>
              <span className="due-date-count">{getAssignmentsByDueCategory('later').length}</span>
            </div>
          </div>
          
          <div className="card-content kanban-content">
            <div className="kanban-board">
              {/* Pending Column */}
              <div className="kanban-column">
                <div className="kanban-column-header">
                  <h4 className="kanban-column-title">Pending</h4>
                  <span className="kanban-count">{getAllTasksByStatus("PENDING").length}</span>
                </div>
                <div className="kanban-column-content">
                  {getAllTasksByStatus("PENDING").length > 0 ? (
                    getAllTasksByStatus("PENDING").map((task) => (
                      <div key={task.id} className={`kanban-card-item ${recentlySubmitted.has(task.id) ? 'just-submitted' : ''}`}>
                        {recentlySubmitted.has(task.id) && (
                          <div className="submission-checkmark-overlay">
                            <div className="checkmark-circle">
                              <svg className="checkmark-svg" viewBox="0 0 52 52">
                                <circle className="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                              </svg>
                            </div>
                            <div className="submission-success-text">Submitted!</div>
                          </div>
                        )}
                        <div className="kanban-card-header">
                          <span 
                            className="kanban-course-badge"
                            style={{ 
                              backgroundColor: getCourseColor(task.courseId),
                              color: getTextColorForBackground(getCourseColor(task.courseId)),
                              borderColor: getCourseColor(task.courseId)
                            }}
                          >
                            {task.courseName}
                          </span>
                          {task.status !== "SUBMITTED" && getDueDateCategory(task.dueDate) && (
                            <span className={`due-date-indicator due-date-indicator-${getDueDateCategory(task.dueDate)}`}>
                              {getDueDateCategory(task.dueDate) === 'today' ? 'Today' : 
                               getDueDateCategory(task.dueDate) === 'thisWeek' ? 'This Week' : 
                               'Later'}
                            </span>
                          )}
                        </div>
                        <div className="kanban-card-body">
                          <h5 className="kanban-card-title">{task.title}</h5>
                          {task.dueText && (
                            <div className="kanban-card-due">
                              <strong>Due:</strong> {task.dueText}
                            </div>
                          )}
                          {task.dueDate && !task.dueText && (
                            <div className="kanban-card-due">
                              <strong>Due:</strong> {typeof task.dueDate === 'string' 
                                ? new Date(task.dueDate).toLocaleDateString()
                                : new Date(task.dueDate.year, task.dueDate.month - 1, task.dueDate.day).toLocaleDateString()}
                            </div>
                          )}
                          {task.status !== "SUBMITTED" && (
                            <button 
                              className="btn-submit-assignment"
                              onClick={() => handleSubmitAssignment(task.id)}
                            >
                              Submit Assignment
                            </button>
                          )}
                          {task.status === "SUBMITTED" && (
                            <div className="kanban-submitted-confirmation">
                              Submitted
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="kanban-empty">No pending assignments</div>
                  )}
                </div>
              </div>

              {/* In Progress Column */}
              <div className="kanban-column">
                <div className="kanban-column-header">
                  <h4 className="kanban-column-title">In Progress</h4>
                  <span className="kanban-count">{getAllTasksByStatus("IN_PROGRESS").length}</span>
                </div>
                <div className="kanban-column-content">
                  {getAllTasksByStatus("IN_PROGRESS").length > 0 ? (
                    getAllTasksByStatus("IN_PROGRESS").map((task) => (
                      <div key={task.id} className={`kanban-card-item ${recentlySubmitted.has(task.id) ? 'just-submitted' : ''}`}>
                        {recentlySubmitted.has(task.id) && (
                          <div className="submission-checkmark-overlay">
                            <div className="checkmark-circle">
                              <svg className="checkmark-svg" viewBox="0 0 52 52">
                                <circle className="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                              </svg>
                            </div>
                            <div className="submission-success-text">Submitted!</div>
                          </div>
                        )}
                        <div className="kanban-card-header">
                          <span 
                            className="kanban-course-badge"
                            style={{ 
                              backgroundColor: getCourseColor(task.courseId),
                              color: getTextColorForBackground(getCourseColor(task.courseId)),
                              borderColor: getCourseColor(task.courseId)
                            }}
                          >
                            {task.courseName}
                          </span>
                          {task.status !== "SUBMITTED" && getDueDateCategory(task.dueDate) && (
                            <span className={`due-date-indicator due-date-indicator-${getDueDateCategory(task.dueDate)}`}>
                              {getDueDateCategory(task.dueDate) === 'today' ? 'Today' : 
                               getDueDateCategory(task.dueDate) === 'thisWeek' ? 'This Week' : 
                               'Later'}
                            </span>
                          )}
                        </div>
                        <div className="kanban-card-body">
                          <h5 className="kanban-card-title">{task.title}</h5>
                          {task.dueText && (
                            <div className="kanban-card-due">
                              <strong>Due:</strong> {task.dueText}
                            </div>
                          )}
                          {task.dueDate && !task.dueText && (
                            <div className="kanban-card-due">
                              <strong>Due:</strong> {typeof task.dueDate === 'string' 
                                ? new Date(task.dueDate).toLocaleDateString()
                                : new Date(task.dueDate.year, task.dueDate.month - 1, task.dueDate.day).toLocaleDateString()}
                            </div>
                          )}
                          {task.status !== "SUBMITTED" && (
                            <button 
                              className="btn-submit-assignment"
                              onClick={() => handleSubmitAssignment(task.id)}
                            >
                              Submit Assignment
                            </button>
                          )}
                          {task.status === "SUBMITTED" && (
                            <div className="kanban-submitted-confirmation">
                              Submitted
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="kanban-empty">No in-progress assignments</div>
                  )}
                </div>
              </div>

              {/* Submitted Column */}
              <div className="kanban-column">
                <div className="kanban-column-header">
                  <h4 className="kanban-column-title">Submitted</h4>
                  <span className="kanban-count">{getAllTasksByStatus("SUBMITTED").length}</span>
                </div>
                <div className="kanban-column-content">
                  {getAllTasksByStatus("SUBMITTED").length > 0 ? (
                    getAllTasksByStatus("SUBMITTED").map((task) => (
                      <div key={task.id} className={`kanban-card-item kanban-card-submitted ${recentlySubmitted.has(task.id) ? 'just-submitted' : ''}`}>
                        {recentlySubmitted.has(task.id) && (
                          <div className="submission-checkmark-overlay">
                            <div className="checkmark-circle">
                              <svg className="checkmark-svg" viewBox="0 0 52 52">
                                <circle className="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                              </svg>
                            </div>
                            <div className="submission-success-text">Submitted!</div>
                          </div>
                        )}
                        <div className="kanban-card-header">
                          <span 
                            className="kanban-course-badge"
                            style={{ 
                              backgroundColor: getCourseColor(task.courseId),
                              color: getTextColorForBackground(getCourseColor(task.courseId)),
                              borderColor: getCourseColor(task.courseId)
                            }}
                          >
                            {task.courseName}
                          </span>
                          <div className="submitted-checkmark-icon">✓</div>
                        </div>
                        <div className="kanban-card-body">
                          <h5 className="kanban-card-title">{task.title}</h5>
                          {task.dueText && (
                            <div className="kanban-card-due">
                              <strong>Due:</strong> {task.dueText}
                            </div>
                          )}
                          {task.dueDate && !task.dueText && (
                            <div className="kanban-card-due">
                              <strong>Due:</strong> {typeof task.dueDate === 'string' 
                                ? new Date(task.dueDate).toLocaleDateString()
                                : new Date(task.dueDate.year, task.dueDate.month - 1, task.dueDate.day).toLocaleDateString()}
                            </div>
                          )}
                          <div className="kanban-submitted-confirmation">
                            ✓ Submitted
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="kanban-empty">No submitted assignments</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
