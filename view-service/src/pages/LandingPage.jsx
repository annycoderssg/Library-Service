import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Calendar, Star, ArrowRight, Library } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="landing-page">
            <nav className="landing-nav">
                <div className="landing-nav-content">
                    <div className="landing-logo">
                        <BookOpen size={28} />
                        <span>Neighborhood Library</span>
                    </div>
                    <div className="landing-nav-links">
                        <Link to="/login" className="nav-link">Sign In</Link>
                        <Link to="/signup" className="nav-link nav-link-primary">Get Started</Link>
                    </div>
                </div>
            </nav>

            <header className="landing-hero">
                <div className="hero-background">
                    <div className="hero-pattern"></div>
                </div>
                <div className="hero-content">
                    <div className="hero-badge">
                        <Library size={16} />
                        <span>Community Library Management</span>
                    </div>
                    <h1>Your Neighborhood's<br /><span>Digital Library</span></h1>
                    <p>
                        A modern library management system designed for local communities.
                        Track books, manage members, and simplify borrowing — all in one place.
                    </p>
                    <div className="hero-buttons">
                        <Link to="/signup" className="hero-btn hero-btn-primary">
                            Get Started Free
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/login" className="hero-btn hero-btn-secondary">
                            Sign In
                        </Link>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-card hero-card-1">
                        <BookOpen size={24} />
                        <span>2,500+ Books</span>
                    </div>
                    <div className="hero-card hero-card-2">
                        <Users size={24} />
                        <span>500+ Members</span>
                    </div>
                    <div className="hero-card hero-card-3">
                        <Calendar size={24} />
                        <span>Easy Tracking</span>
                    </div>
                </div>
            </header>

            <section className="landing-features">
                <div className="features-header">
                    <h2>Everything You Need</h2>
                    <p>Powerful features to manage your community library efficiently</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <BookOpen size={24} />
                        </div>
                        <h3>Book Management</h3>
                        <p>Catalog your entire collection with detailed information, categories, and availability tracking.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <Users size={24} />
                        </div>
                        <h3>Member Directory</h3>
                        <p>Keep track of all library members, their borrowing history, and membership status.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <Calendar size={24} />
                        </div>
                        <h3>Borrowing System</h3>
                        <p>Simple checkout and return process with automatic due date tracking and reminders.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <Star size={24} />
                        </div>
                        <h3>Testimonials</h3>
                        <p>Collect and showcase feedback from your community members.</p>
                    </div>
                </div>
            </section>

            <section className="landing-cta">
                <div className="cta-content">
                    <h2>Ready to Transform Your Library?</h2>
                    <p>Join hundreds of community libraries already using our platform.</p>
                    <Link to="/signup" className="cta-button">
                        Start For Free
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-logo">
                        <BookOpen size={24} />
                        <span>Neighborhood Library</span>
                    </div>
                    <p>© 2024 Neighborhood Library Service. Built with care for communities.</p>
                </div>
            </footer>
        </div>
    )
}
