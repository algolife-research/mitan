/**
 * Resizable Mobile Sidebar
 * Allows users to resize the sidebar on mobile devices by dragging
 */
document.addEventListener("DOMContentLoaded", function() {
  const sidebar = document.getElementById('sidebar');
  const map = document.getElementById('map');
  if (!sidebar || !map) return;
  
  // Create a drag handle that will appear at the top of the sidebar on mobile
  const dragHandle = document.createElement('div');
  dragHandle.className = 'sidebar-drag-handle';
  dragHandle.innerHTML = '<div class="handle-bar"></div>';
  sidebar.prepend(dragHandle);
  
  // Variables to track drag state
  let isDragging = false;
  let startY = 0;
  let startHeight = 0;
  let windowHeight = window.innerHeight;
  
  // Constants for min/max sidebar size
  const MIN_HEIGHT_PERCENT = 10;
  const MAX_HEIGHT_PERCENT = 50;
  
  // Calculate min/max heights in pixels
  const getMinHeight = () => windowHeight * (MIN_HEIGHT_PERCENT / 100);
  const getMaxHeight = () => windowHeight * (MAX_HEIGHT_PERCENT / 100);
  
  // Update sidebar and map sizes
  function updateSizes(newSidebarHeight) {
    // Constrain the height between min and max values
    const minHeight = getMinHeight();
    const maxHeight = getMaxHeight();
    newSidebarHeight = Math.max(minHeight, Math.min(newSidebarHeight, maxHeight));
    
    // Update sidebar height
    sidebar.style.height = `${newSidebarHeight}px`;
    
    // Update map height to take the remaining space
    const navbarHeight = 40; // Navbar height
    map.style.height = `${windowHeight - navbarHeight - newSidebarHeight}px`;
  }
  
  // Touch event handlers
  dragHandle.addEventListener('touchstart', function(e) {
    if (window.innerWidth > 768) return; // Only activate on mobile
    
    isDragging = true;
    startY = e.touches[0].clientY;
    startHeight = sidebar.offsetHeight;
    dragHandle.classList.add('dragging');
    e.preventDefault(); // Prevent scroll during drag
  }, { passive: false });
  
  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    
    const deltaY = startY - e.touches[0].clientY;
    const newHeight = startHeight - deltaY;
    updateSizes(newHeight);
    e.preventDefault(); // Prevent scroll during drag
  }, { passive: false });
  
  document.addEventListener('touchend', function() {
    if (!isDragging) return;
    
    isDragging = false;
    dragHandle.classList.remove('dragging');
    
    // Store the sidebar height preference in localStorage
    localStorage.setItem('sidebarHeight', sidebar.style.height);
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    windowHeight = window.innerHeight;
    
    // Restore previous height on orientation change or other resizes
    if (window.innerWidth <= 768) {
      const savedHeight = localStorage.getItem('sidebarHeight');
      if (savedHeight) {
        const heightValue = parseInt(savedHeight);
        if (!isNaN(heightValue)) {
          updateSizes(heightValue);
        }
      }
    }
  });
  
  // Initial setup for mobile
  if (window.innerWidth <= 768) {
    const savedHeight = localStorage.getItem('sidebarHeight');
    if (savedHeight) {
      // Apply saved height
      updateSizes(parseInt(savedHeight));
    } else {
      // Default to 35% on first visit
      updateSizes(windowHeight * 0.35);
    }
  }
});
