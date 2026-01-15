import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
let db;
try {
  db = new Database(path.join(__dirname, 'database.sqlite'));
  console.log('Database file opened successfully');
} catch (error) {
  console.error('Error opening database:', error);
  throw error;
}

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
function initDatabase() {
  try {
    // Custom Tasks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS custom_tasks (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        title TEXT NOT NULL,
        course_id TEXT,
        course_name TEXT NOT NULL,
        due_date TEXT,
        due_text TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Subtasks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES custom_tasks(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_custom_tasks_user_email ON custom_tasks(user_email);
      CREATE INDEX IF NOT EXISTS idx_custom_tasks_status ON custom_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Initialize on import
initDatabase();

// Prepared statements for better performance
const stmts = {
  // Custom Tasks
  insertTask: db.prepare(`
    INSERT INTO custom_tasks (id, user_email, title, course_id, course_name, due_date, due_text, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  getTasksByUser: db.prepare(`
    SELECT * FROM custom_tasks WHERE user_email = ? ORDER BY created_at DESC
  `),
  
  getTaskById: db.prepare(`
    SELECT * FROM custom_tasks WHERE id = ?
  `),
  
  updateTask: db.prepare(`
    UPDATE custom_tasks 
    SET title = ?, course_id = ?, course_name = ?, due_date = ?, due_text = ?, status = ?, updated_at = datetime('now')
    WHERE id = ? AND user_email = ?
  `),
  
  deleteTask: db.prepare(`
    DELETE FROM custom_tasks WHERE id = ? AND user_email = ?
  `),
  
  // Subtasks
  insertSubtask: db.prepare(`
    INSERT INTO subtasks (id, task_id, text, completed)
    VALUES (?, ?, ?, ?)
  `),
  
  getSubtasksByTaskId: db.prepare(`
    SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC
  `),
  
  getSubtaskById: db.prepare(`
    SELECT * FROM subtasks WHERE id = ?
  `),
  
  updateSubtask: db.prepare(`
    UPDATE subtasks 
    SET text = ?, completed = ?, updated_at = datetime('now')
    WHERE id = ? AND task_id = ?
  `),
  
  toggleSubtask: db.prepare(`
    UPDATE subtasks 
    SET completed = NOT completed, updated_at = datetime('now')
    WHERE id = ? AND task_id = ?
  `),
  
  deleteSubtask: db.prepare(`
    DELETE FROM subtasks WHERE id = ? AND task_id = ?
  `),
  
  deleteSubtasksByTaskId: db.prepare(`
    DELETE FROM subtasks WHERE task_id = ?
  `),
};

// Database operations
export const dbOps = {
  // Custom Tasks
  createTask: (task) => {
    return stmts.insertTask.run(
      task.id,
      task.userEmail,
      task.title,
      task.courseId || null,
      task.courseName,
      task.dueDate || null,
      task.dueText || null,
      task.status || 'PENDING'
    );
  },
  
  getTasks: (userEmail) => {
    const tasks = stmts.getTasksByUser.all(userEmail);
    // Convert snake_case to camelCase
    return tasks.map(task => ({
      id: task.id,
      userEmail: task.user_email,
      title: task.title,
      courseId: task.course_id,
      courseName: task.course_name,
      dueDate: task.due_date,
      dueText: task.due_text,
      status: task.status,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));
  },
  
  getTask: (taskId) => {
    const task = stmts.getTaskById.get(taskId);
    if (!task) return null;
    // Convert snake_case to camelCase
    return {
      id: task.id,
      userEmail: task.user_email,
      title: task.title,
      courseId: task.course_id,
      courseName: task.course_name,
      dueDate: task.due_date,
      dueText: task.due_text,
      status: task.status,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };
  },
  
  updateTask: (taskId, userEmail, updates) => {
    return stmts.updateTask.run(
      updates.title,
      updates.courseId || null,
      updates.courseName,
      updates.dueDate || null,
      updates.dueText || null,
      updates.status || 'PENDING',
      taskId,
      userEmail
    );
  },
  
  deleteTask: (taskId, userEmail) => {
    return stmts.deleteTask.run(taskId, userEmail);
  },
  
  // Subtasks
  createSubtask: (subtask) => {
    return stmts.insertSubtask.run(
      subtask.id,
      subtask.taskId,
      subtask.text,
      subtask.completed ? 1 : 0
    );
  },
  
  getSubtasks: (taskId) => {
    const results = stmts.getSubtasksByTaskId.all(taskId);
    // Convert completed from integer to boolean
    return results.map(row => ({
      ...row,
      completed: row.completed === 1
    }));
  },
  
  getSubtask: (subtaskId) => {
    const result = stmts.getSubtaskById.get(subtaskId);
    if (result) {
      result.completed = result.completed === 1;
    }
    return result;
  },
  
  updateSubtask: (subtaskId, taskId, updates) => {
    return stmts.updateSubtask.run(
      updates.text,
      updates.completed ? 1 : 0,
      subtaskId,
      taskId
    );
  },
  
  toggleSubtask: (subtaskId, taskId) => {
    return stmts.toggleSubtask.run(subtaskId, taskId);
  },
  
  deleteSubtask: (subtaskId, taskId) => {
    return stmts.deleteSubtask.run(subtaskId, taskId);
  },
};

export default db;

