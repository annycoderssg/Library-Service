-- Neighborhood Library Service Database Schema for PostgreSQL

-- Create database (run this separately if needed)
-- CREATE DATABASE project_assignment;
-- \c project_assignment;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    published_year INTEGER,
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at for books table
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    membership_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at for members table
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Borrowings table (tracks book lending operations)
CREATE TABLE IF NOT EXISTS borrowings (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL,
    member_id INTEGER,  -- Nullable to preserve history when member is deleted
    borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'borrowed',
    fine_amount NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
    CONSTRAINT chk_status CHECK (status IN ('borrowed', 'returned', 'overdue'))
);

-- Trigger to update updated_at for borrowings table
CREATE TRIGGER update_borrowings_updated_at BEFORE UPDATE ON borrowings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_role CHECK (role IN ('admin', 'member'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_borrowings_book_id ON borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_member_id ON borrowings(member_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Sample Books
INSERT INTO books (title, author, isbn, published_year, total_copies, available_copies) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 1925, 3, 3),
('To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 1960, 5, 5),
('1984', 'George Orwell', '978-0451524935', 1949, 4, 4),
('Pride and Prejudice', 'Jane Austen', '978-0141439518', 1813, 2, 2),
('The Catcher in the Rye', 'J.D. Salinger', '978-0316769488', 1951, 3, 3),
('Clean Code', 'Robert C. Martin', '978-0132350884', 2008, 2, 2),
('Design Patterns', 'Gang of Four', '978-0201633610', 1994, 2, 2),
('Python Crash Course', 'Eric Matthes', '978-1593279288', 2019, 4, 4),
('JavaScript: The Good Parts', 'Douglas Crockford', '978-0596517748', 2008, 3, 3),
('Database Systems', 'Raghu Ramakrishnan', '978-0072465631', 2002, 2, 2)
ON CONFLICT (isbn) DO NOTHING;

-- Sample Members
INSERT INTO members (name, email, phone, address) VALUES
('John Doe', 'john.doe@example.com', '555-0101', '123 Main St, City'),
('Jane Smith', 'jane.smith@example.com', '555-0102', '456 Oak Ave, Town'),
('Bob Wilson', 'bob.wilson@example.com', '555-0103', '789 Pine Rd, Village')
ON CONFLICT (email) DO NOTHING;

-- Note: Admin user should be created using create_admin.py script
-- Sample admin password hash for 'Admin@123' (bcrypt)
-- INSERT INTO users (email, password_hash, role) VALUES
-- ('admin@library.com', '$2b$12$...hash...', 'admin');
