import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faStar, faFilter, faSort, faComments, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import '../styles/Reviews.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Reviews = () => {
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [sortBy, setSortBy] = useState('newest');
    const [ratingFilter, setRatingFilter] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userReview, setUserReview] = useState(null);
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        fetchReviews();
        if (user) {
            fetchUserReview();
        }
    }, [sortBy, ratingFilter]);

    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            console.log('Fetching reviews from:', `${API_URL}/api/reviews?sort_by=${sortBy}&rating_filter=${ratingFilter}`);
            
            const response = await fetch(
                `${API_URL}/api/reviews?sort_by=${sortBy}&rating_filter=${ratingFilter}`
            );
            
            console.log('Response status:', response.status);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            
            const data = await response.json();
            console.log('Fetched reviews data:', data);
            
            if (data.success && Array.isArray(data.reviews)) {
                console.log('Setting reviews:', data.reviews);
                setReviews(data.reviews);
                setFilteredReviews(data.reviews);
            } else {
                console.error('Invalid reviews data format:', data);
                setReviews([]);
                setFilteredReviews([]);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            addToast({
                title: 'Error',
                message: 'Failed to load reviews',
                type: 'error'
            });
            setReviews([]);
            setFilteredReviews([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const filtered = reviews.filter(review => 
                review.message.toLowerCase().includes(query) ||
                review.username.toLowerCase().includes(query)
            );
            setFilteredReviews(filtered);
        } else {
            setFilteredReviews(reviews);
        }
    }, [searchQuery, reviews]);

    const fetchUserReview = async () => {
        try {
            const response = await fetch(`${API_URL}/api/reviews/user/${user.id}`);
            if (!response.ok) throw new Error('Failed to fetch user review');
            const data = await response.json();
            if (data.success && data.reviews && data.reviews.length > 0) {
                setUserReview(data.reviews[0]);
            }
        } catch (error) {
            console.error('Error fetching user review:', error);
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            addToast({
                title: 'Error',
                message: 'Please login to submit a review',
                type: 'error'
            });
            return;
        }

        const formData = new FormData(e.target);
        const reviewData = {
            user_id: user.id,
            username: user.username,
            rating: parseInt(formData.get('rating')),
            message: formData.get('message')
        };

        console.log('Submitting review data:', reviewData);

        try {
            const response = await fetch(`${API_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(reviewData)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) throw new Error('Failed to submit review');
            
            if (data.success) {
                addToast({
                    title: 'Success',
                    message: data.is_update ? 'Review updated successfully!' : 'Review submitted successfully!',
                    type: 'success'
                });
                fetchReviews();
                fetchUserReview();
                e.target.reset();
            } else {
                throw new Error(data.message || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            addToast({
                title: 'Error',
                message: error.message || 'Failed to submit review',
                type: 'error'
            });
        }
    };

    if (isLoading) {
        return (
            <div className="reviews-page">
                <div className="container">
                    <h1 className="page-title">Customer Reviews</h1>
                    <div className="loading">Loading reviews...</div>
                </div>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="reviews-page">
                <div className="container">
                    <h1 className="page-title">Customer Reviews</h1>
                    <div className="no-reviews">
                        <FontAwesomeIcon icon={faComments} className="no-reviews-icon" />
                        <h2>No Reviews Yet</h2>
                        <p>Be the first to share your experience with TRAVIS!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="reviews-page">
            <div className="container">
                <h1 className="page-title">User Reviews</h1>
                
                {/* Review Submission Form */}
                {user && (
                    <form onSubmit={handleReviewSubmit} className="review-form">
                        <div className="form-group">
                            <label>{userReview ? 'Edit Your Rating' : 'Your Rating'}</label>
                            <div className="rating-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <label key={star}>
                                        <input
                                            type="radio"
                                            name="rating"
                                            value={star}
                                            defaultChecked={userReview && userReview.rating === star}
                                            required
                                        />
                                        <FontAwesomeIcon icon={faStar} />
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{userReview ? 'Edit Your Review' : 'Your Review'}</label>
                            <textarea
                                name="message"
                                required
                                placeholder="Share your experience with TRAVIS..."
                                defaultValue={userReview ? userReview.message : ''}
                            />
                        </div>
                        <button type="submit" className="submit-button">
                            {userReview ? 'Update Review' : 'Submit Review'}
                        </button>
                    </form>
                )}
                
                {/* Filters and Search */}
                <div className="reviews-controls">
                    <div className="search-box">
                        <FontAwesomeIcon icon={faSearch} />
                        <input
                            type="text"
                            placeholder="Search reviews..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="filters">
                        <div className="rating-filter">
                            <FontAwesomeIcon icon={faFilter} />
                            <select 
                                value={ratingFilter} 
                                onChange={(e) => setRatingFilter(Number(e.target.value))}
                            >
                                <option value="0">All Ratings</option>
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                        </div>
                        
                        <div className="sort-filter">
                            <FontAwesomeIcon icon={faSort} />
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="highest">Highest Rated</option>
                                <option value="lowest">Lowest Rated</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Reviews List */}
                <div className="reviews-list">
                    {filteredReviews.length > 0 ? (
                        filteredReviews.map(review => (
                            <div key={review.id} className="review-card">
                                <div className="review-header">
                                    <div className="reviewer-avatar">
                                        <FontAwesomeIcon icon={faUser} />
                                    </div>
                                    <div className="reviewer-info">
                                        <h4>{review.username}</h4>
                                        <div className="review-rating">
                                            {[...Array(5)].map((_, i) => (
                                                <FontAwesomeIcon 
                                                    key={i} 
                                                    icon={faStar} 
                                                    className={i < review.rating ? 'active' : ''}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p className="review-text">{review.message}</p>
                                <div className="review-date">
                                    {new Date(review.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-reviews">
                            <FontAwesomeIcon icon={faStar} className="no-reviews-icon" />
                            <h3>No Reviews Found</h3>
                            <p>Try adjusting your filters or search criteria</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reviews; 