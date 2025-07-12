const Footer = () => {
    return (
        <footer className="footer">
        <div className="footer-container">
          <div className="footer-col">
            <div className="footer-logo">
              <img src="https://i.pinimg.com/736x/54/7b/dd/547bdd12d3e3d673a0ad7edea712f8e1.jpg" alt="GreenFarm Logo" className="logo-img" />
              <span>GreenFarm</span>
            </div>
            <p className="footer-about">
              We are dedicated to providing organic and sustainable farming solutions for a healthier planet.
            </p>
            <div className="social-links">
              <a href="#"><i className="fab fa-facebook"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-instagram"></i></a>
              <a href="#"><i className="fab fa-linkedin"></i></a>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/products">Products</a></li>
              <li><a href="/services">Services</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">Products</h3>
            <ul className="footer-links">
              <li><a href="/vegetables">Fresh Vegetables</a></li>
              <li><a href="/fruits">Organic Fruits</a></li>
              <li><a href="/dairy">Dairy Products</a></li>
              <li><a href="/grains">Whole Grains</a></li>
              <li><a href="/honey">Natural Honey</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">Contact Us</h3>
            <ul className="footer-contact">
              <li><i className="fas fa-map-marker-alt"></i> 123 Farm Road, Green Valley</li>
              <li><i className="fas fa-phone"></i> +1 (123) 456-7890</li>
              <li><i className="fas fa-envelope"></i> info@ecoland.com</li>
              <li><i className="fas fa-clock"></i> Mon-Sat: 8AM - 6PM</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Ecoland. All Rights Reserved.</p>
          <div className="footer-legal">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </footer>

    )
}

export default Footer 