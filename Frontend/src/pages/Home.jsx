import { Link } from 'react-router-dom'
import './Home.css';

//import './App.css';

const Home = () => {
  return (
    <div className="app-container">
      {/* Navbar */}

      {/* Hero Section */}
      <section className="hero-section" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('https://i.pinimg.com/736x/e2/6d/35/e26d352c8710bab40b472bca96997506.jpg')" }}>
        <div className="hero-content">
          <h1 className="hero-title">We are Producing Natural Products</h1>
          <div className="hero-tagline">
            <span className="organic-tag">Organic</span>
            <span className="farming-tag">Farming</span>
          </div>
          {/* <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <h2 className="stat-number">100K+</h2>
            <p className="stat-text">Happy Clients</p>
          </div>
          <div className="stat-item">
            <h2 className="stat-number">500+</h2>
            <p className="stat-text">Sales</p>
          </div>
          <div className="stat-item">
            <h2 className="stat-number">10+</h2>
            <p className="stat-text">Years Experience</p>
          </div>
          <div className="stat-item">
            <h2 className="stat-number">4.9</h2>
            <p className="stat-text">Customer Rating</p>
          </div>
        </div>
      </section> */}
        </div>
        
      </section>
 
      {/* Featured Products */}
      <section className="featured-section">
        <div className="section-header">
          <h2 className="section-title">Our Featured Products</h2>
          <p className="section-subtitle">Fresh from our farms to your table</p>
        </div>
        <div className="products-grid">
          <div className="product-card">
            <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" alt="Organic Vegetables" className="product-img" />
            <h3>Fresh Vegetables</h3>
            <p>100% organic, pesticide-free vegetables</p>
            <button className="product-btn">View Products</button>
          </div>
          <div className="product-card">
            <img src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" alt="Organic Fruits" className="product-img" />
            <h3>Seasonal Fruits</h3>
            <p>Naturally ripened, full of flavor</p>
            <button className="product-btn">View Products</button>
          </div>
          <div className="product-card">
            <img src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" alt="Whole Grains" className="product-img" />
            <h3>Whole Grains</h3>
            <p>Nutritious and wholesome grain products</p>
            <button className="product-btn">View Products</button>
          </div>
          <div className="product-card">
            <img src="https://i.pinimg.com/736x/ad/09/0f/ad090ffb0b75769c6167fa497e5f7a9a.jpg" alt="Seasonal Products" className="product-img" />
            <h3>Seasonal Products</h3>
            <p>Fresh harvests from each season</p>
            <button className="product-btn">View Products</button>
          </div>
          <div className="product-card">
            <img src="https://i.pinimg.com/1200x/09/b3/1c/09b31c8aeb43681a4ab54065d453d20d.jpg" alt="Regional Products" className="product-img" />
            <h3>Regional Products</h3>
            <p>Local specialties from our region</p>
            <button className="product-btn">View Products</button>
          </div>
          <div className="product-card">
            <img src="https://i.pinimg.com/736x/7d/d6/ea/7dd6ea31821901f477912c563313eb53.jpg" alt="Organic Herbs" className="product-img" />
            <h3>Organic Herbs</h3>
            <p>Fresh herbs and spices from our garden</p>
            <button className="product-btn">View Products</button>
          </div>
        </div>
      </section>
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <h3 className="stat-number">100K+</h3>
            <p className="stat-text">Happy Clients</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number">500+</h3>
            <p className="stat-text">Sales</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number">10</h3>
            <p className="stat-text">Years Experience</p>
          </div>
          <div className="stat-item">
            <h3 className="stat-number">4.9</h3>
            <p className="stat-text">Customer Rating</p>
          </div>
        </div>
      </section>
      
      <section className="testimonial-section">
        <div className="section-header">
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle">Trusted by farmers and consumers alike</p>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80" alt="Customer" className="testimonial-img" />
            <p className="testimonial-text">"The quality of produce from GreenFarm is unmatched. My family has been healthier since we switched to their products. Fresh delivery every week!"</p>
            <h4 className="testimonial-name">- Sarah Johnson, Buyer</h4>
            <div className="testimonial-rating">★★★★★</div>
          </div>
          <div className="testimonial-card">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80" alt="Farmer" className="testimonial-img" />
            <p className="testimonial-text">"GreenFarm's consulting services transformed our farm's productivity while maintaining organic standards. Their expertise is invaluable."</p>
            <h4 className="testimonial-name">- Michael Chen, Farmer</h4>
            <div className="testimonial-rating">★★★★★</div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter-section">
        <div className="newsletter-container">
          <div className="newsletter-content">
            <h2>Subscribe to Our Newsletter</h2>
            <p>Get updates on seasonal products, farming tips, and special offers.</p>
          </div>
          <form className="newsletter-form">
            <input type="email" placeholder="Your email address" required />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </section>

      {/* Footer */}

    </div>
  );
};

export default Home;