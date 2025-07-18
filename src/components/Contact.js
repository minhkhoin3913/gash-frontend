import React, { useState, useCallback } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import "../styles/Contact.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      console.log("Form submitted:", formData);
      // Handle form submission here (e.g., API call)
    },
    [formData]
  );

  return (
    <div className="contact-container">
      <header className="contact-header">
        <h1>
          Contact us
          <div className="contact-header-underline"></div>
        </h1>
        <p>
          Sed cursus eget risus non vestibulum. Sed in molestie elit, vitae leo metus, sed imperdiet lorem fermentum et
          metus, sed imperdiet non vestibulum. Sed in molestie elit, vitae condimentum jusnean vulputate leo metus, sed
          imperdiet lorem fermentum et metus, sed imperdiet ursus eget risus non vestibulum. Sed in molestie elit, vitae
          condimentum justo. Aenean vulputate leo metus, sed imperdiet lorem fermentum et metus, sed imperdiet.
        </p>
      </header>

      <div className="contact-content">
        <aside className="contact-info" role="complementary" aria-label="Contact information">
          <div className="contact-info-item">
            <div className="contact-info-icon">
              <Mail size={24} color="var(--amazon-text)" />
            </div>
            <div>
              <h3>Mail</h3>
              <p>help@blogdesk.com</p>
            </div>
          </div>

          <div className="contact-info-item">
            <div className="contact-info-icon">
              <Phone size={24} color="var(--amazon-text)" />
            </div>
            <div>
              <h3>Phone</h3>
              <p>+92 - 334 - 2797084</p>
            </div>
          </div>

          <div className="contact-info-item">
            <div className="contact-info-icon">
              <MapPin size={24} color="var(--amazon-text)" />
            </div>
            <div>
              <h3>Address</h3>
              <p>30 Ab 1 Johar Town F2 Block D, USA</p>
            </div>
          </div>
        </aside>

        <main className="contact-form-section" role="main">
          <h2>
            Leave Message
            <div className="contact-form-underline"></div>
          </h2>
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="contact-form-grid">
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleInputChange}
                aria-label="Your Name"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleInputChange}
                aria-label="Your Email"
                required
              />
            </div>
            <input
              type="tel"
              name="phone"
              placeholder="Your Phone"
              value={formData.phone}
              onChange={handleInputChange}
              aria-label="Your Phone"
            />
            <textarea
              name="message"
              placeholder="Your Message"
              value={formData.message}
              onChange={handleInputChange}
              rows={6}
              aria-label="Your Message"
              required
            />
            <button type="submit" className="contact-submit-button" aria-label="Send message">
              <Send size={18} />
              Send Us Now
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Contact;