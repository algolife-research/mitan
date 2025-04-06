/**
 * Mobile sidebar functionality
 * Handles the scrollable sidebar on mobile devices
 */
document.addEventListener("DOMContentLoaded", function() {
  // Function to set up mobile sidebar
  function setupMobileSidebar() {
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      
      // Add mobile-specific class
      sidebar.classList.add('mobile-sidebar');
      
      // Hide the search section title
      const searchSectionTitle = document.querySelector('#search-section h3');
      if (searchSectionTitle) {
        searchSectionTitle.style.display = 'none';
      }
      
      // Add fade indicator at the bottom
      if (!document.querySelector('.sidebar-fade-bottom')) {
        const fadeElement = document.createElement('div');
        fadeElement.className = 'sidebar-fade-bottom';
        sidebar.appendChild(fadeElement);
      }
      
      // Add scroll event to show/hide fade based on scroll position
      sidebar.addEventListener('scroll', function() {
        const fadeElement = document.querySelector('.sidebar-fade-bottom');
        if (fadeElement) {
          // If user has scrolled to the bottom, hide the fade
          if (this.scrollHeight - this.scrollTop <= this.clientHeight + 20) {
            fadeElement.style.opacity = '0';
          } else {
            fadeElement.style.opacity = '1';
          }
        }
      });
      
      // Add touch events for better mobile experience
      let startY = 0;
      let startHeight = 0;
      
      // Handle scroll within sidebar to prevent map interaction when scrolling
      sidebar.addEventListener('touchmove', function(e) {
        e.stopPropagation();
      }, { passive: true });
      
      // Optional: add swipe up gesture to expand sidebar height temporarily
      sidebar.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
        startHeight = parseInt(getComputedStyle(sidebar).height);
      }, { passive: true });
      
      sidebar.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;
        const deltaY = startY - currentY;
        
        // If swiping up and near the bottom of the content
        if (deltaY > 20 && this.scrollTop + this.clientHeight >= this.scrollHeight - 30) {
          const newHeight = Math.min(startHeight + deltaY, window.innerHeight * 0.7);
          this.style.height = newHeight + 'px';
        }
      }, { passive: true });
      
      sidebar.addEventListener('touchend', function() {
        // Reset to default height after a delay
        setTimeout(() => {
          this.style.height = '';
        }, 1000);
      }, { passive: true });
    }
  }
  
  // Run setup
  setupMobileSidebar();
  
  // Also run on resize to handle orientation changes
  window.addEventListener('resize', setupMobileSidebar);
});
