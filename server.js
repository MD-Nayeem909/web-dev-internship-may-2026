const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables. Try .env first, then fallback to .env.example
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config();
} else {
  require('dotenv').config({ path: path.join(__dirname, '.env.example') });
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Serve static files from root directory
app.use(express.static(__dirname));

// PostgreSQL Connection Pool
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon PostgreSQL
    }
  });

  // Verify DB Connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error acquiring client from PostgreSQL pool:', err.message);
    } else {
      console.log('Successfully connected to Neon PostgreSQL Database.');
      release();
    }
  });
} else {
  console.warn('WARNING: DATABASE_URL is not set in environment variables.');
}

// API: DB Status Check
app.get('/api/db-status', async (req, res) => {
  if (!pool) {
    return res.json({ connected: false, error: 'Database pool not initialized.' });
  }
  try {
    const client = await pool.connect();
    client.release();
    res.json({ connected: true });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

// API: Get Questions
app.get('/api/questions', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }
  let client;
  try {
    client = await pool.connect();
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ success: true, questions: [] });
    }
    
    const result = await client.query('SELECT * FROM questions ORDER BY id ASC;');
    
    // Map DB columns to client properties
    const questions = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      question: row.question,
      optionA: row.option_a,
      optionB: row.option_b,
      optionC: row.option_c,
      optionD: row.option_d,
      answer: row.answer
    }));
    
    res.json({ success: true, questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: error.message || 'An error occurred.' });
  } finally {
    if (client) client.release();
  }
});

// API: Save Questions
app.post('/api/save-questions', async (req, res) => {
  const { questions } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: 'Invalid input. Expected an array of questions.' });
  }

  if (!pool) {
    return res.status(500).json({ success: false, error: 'Database connection is not configured.' });
  }

  let client;
  try {
    client = await pool.connect();
    
    // Start Transaction
    await client.query('BEGIN');

    // Create table if it does not exist matching the readme.md schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        user_id INT,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        answer VARCHAR(10) NOT NULL
      );
    `);

    // Insert questions
    const insertQuery = `
      INSERT INTO questions (id, user_id, question, option_a, option_b, option_c, option_d, answer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) 
      DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        question = EXCLUDED.question,
        option_a = EXCLUDED.option_a,
        option_b = EXCLUDED.option_b,
        option_c = EXCLUDED.option_c,
        option_d = EXCLUDED.option_d,
        answer = EXCLUDED.answer;
    `;

    for (const q of questions) {
      // Validate required fields
      if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.answer) {
        throw new Error(`Invalid question data for ID ${q.id}. All options and answer must be present.`);
      }

      await client.query(insertQuery, [
        q.id,
        q.userId || 1, // Default user_id to 1 if not provided
        q.question,
        q.optionA,
        q.optionB,
        q.optionC,
        q.optionD,
        q.answer
      ]);
    }

    // Update the serial sequence if necessary (since we manually inserted ID values)
    await client.query(`
      SELECT setval(pg_get_serial_sequence('questions', 'id'), coalesce(max(id), 0) + 1, false) FROM questions;
    `);

    // Commit Transaction
    await client.query('COMMIT');
    res.json({ success: true, message: `${questions.length} questions successfully saved to the database.` });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error saving questions to DB:', error);
    res.status(500).json({ success: false, error: error.message || 'An error occurred while saving questions.' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`MCQ Question Parser server is running at http://localhost:${port}`);
});
