import { Link } from 'react-router-dom';
import './About.css';

const About = () => {
  return (
    <div className="app-container">

      {/* About Page Content */}
      <div className="about-page">
        {/* Hero Banner */}
        <section className="about-hero" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1500&q=80')" }}>
          <div className="container">
            <h1>Cultivating Sustainability</h1>
            <p>Our network of skilled farmers ensures sustainable and ethical farming practices</p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mission-section">
          <div className="container">
            <div className="mission-content">
              <h2>Our Farming Community</h2>
              <div className="mission-grid">
                <div className="mission-card">
                  <div className="icon">🌱</div>
                  <h3>Skilled Network</h3>
                  <p>200+ certified organic farmers working with sustainable methods</p>
                </div>
                <div className="mission-card">
                  <div className="icon">🌍</div>
                  <h3>Land Stewardship</h3>
                  <p>5,000+ acres under our sustainable management program</p>
                </div>
                <div className="mission-card">
                  <div className="icon">📈</div>
                  <h3>Growth Focused</h3>
                  <p>Premium farm assets that grow your capital alongside our crops</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sustainable Practices */}
        <section className="practices-section">
          <div className="container">
            <div className="section-header">
              <h2>Our Sustainable Practices</h2>
              <p>How we maintain ecological balance while maximizing yields</p>
            </div>
            <div className="practices-grid">
              <div className="practice-card">
                <img src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" alt="Crop Rotation" />
                <h3>Regenerative Agriculture</h3>
                <p>We implement crop rotation and cover cropping to enhance soil health and biodiversity</p>
              </div>
              <div className="practice-card">
                <img src="https://i.pinimg.com/736x/ca/44/b7/ca44b747a10dfb4ba9d00f60e7580828.jpg" alt="Water Conservation" />
                <h3>Water Conservation</h3>
                <p>Precision irrigation systems reduce water usage by up to 40% compared to traditional methods</p>
              </div>
              <div className="practice-card">
                <img src="https://i.pinimg.com/736x/8e/ab/72/8eab727dd4dba9dae89ea1c7882b8475.jpg" alt="Renewable Energy" />
                <h3>Renewable Energy</h3>
                <p>Solar-powered operations across 85% of our farm network</p>
              </div>
            </div>
          </div>
        </section>

        {/* Investment Section */}
        <section className="investment-section">
          <div className="container">
            <div className="investment-content">
              <h2>Growing Together</h2>
              <p className="highlight-text">
                Our premium farm assets ensure your capital grows alongside our sustainable operations. 
                We combine agricultural expertise with smart financial models to deliver consistent returns.
              </p>
              <div className="investment-stats">
                <div className="stat-item">
                  <h3>15-25%</h3>
                  <p>Average annual ROI for investors</p>
                </div>
                <div className="stat-item">
                  <h3>100%</h3>
                  <p>Transparent operations</p>
                </div>
                <div className="stat-item">
                  <h3>5+ Years</h3>
                  <p>Track record of success</p>
                </div>
              </div>
              <Link to="/invest" className="cta-button">Learn About Investing</Link>
            </div>
          </div>
        </section>

        {/* Farmer Network */}
        <section className="farmers-section">
          <div className="container">
            <div className="section-header">
              <h2>Our Farmer Network</h2>
              <p>Meet some of the skilled professionals behind our operations</p>
            </div>
            <div className="farmers-grid">
              <div className="farmer-card">
                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" alt="Farmer Maria" />
                <h3>Maria Gonzalez</h3>
                <p>Organic Vegetable Specialist</p>
                <p className="farmer-quote">"Sustainable farming isn't just a practice, it's our responsibility to future generations."</p>
              </div>
              <div className="farmer-card">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" alt="Farmer James" />
                <h3>James Wilson</h3>
                <p>Regenerative Agriculture Expert</p>
                <p className="farmer-quote">"Healthy soil means healthy food and a healthy planet."</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="about-cta">
          <div className="container">
            <h2>Join Our Sustainable Farming Movement</h2>
            <div className="cta-buttons">
              <Link to="/contact" className="cta-btn primary">Become a Partner Farmer</Link>
              <Link to="/invest" className="cta-btn secondary">Investment Opportunities</Link>
            </div>
          </div>
        </section>
      </div>

     
    </div>
  );
};

export default About;