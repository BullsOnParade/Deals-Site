document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - starting app');
  
  // Only run on index.html
  if (!document.querySelector('.featured-deals')) {
    console.log('Not on index page, skipping initialization');
    return;
  }
  
  try {
    initializeApp();
  } catch (error) {
    console.error('Error in DOMContentLoaded:', error);
    hideLoadingStates();
  }
});

// --- GLOBAL STATE ---
let allDealsData = [];
let filteredDealsData = [];
let currentPage = 1;
const dealsPerPage = 20;
let dealsSort = { column: 'title', direction: 'asc' }; // Initial sort state
let currentSearchTerm = '';

// Popular games pagination
let popularGamesData = [];
let popularCurrentPage = 1;
const popularItemsPerPage = 10;

// --- INITIALIZATION ---
function initializeApp() {
  console.log('Starting app initialization...');
  
  // Show loading states immediately
  showLoadingStates();
  
  // Fallback timeout to hide loading states if something goes wrong
  setTimeout(() => {
    console.log('Fallback timeout reached - hiding loading states');
    hideLoadingStates();
  }, 15000); // 15 second fallback
  
  // Test if we can access the deals.json file
  console.log('Testing deals.json access...');
  
  // Add timeout to prevent infinite loading
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('Fetch timeout reached');
    controller.abort();
  }, 10000); // 10 second timeout
  
  fetch('deals.json', { 
    signal: controller.signal,
    cache: 'no-cache' // Prevent caching issues
  })
    .then(response => {
      clearTimeout(timeoutId);
      console.log('Fetch response received:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(deals => {
      console.log(`Loaded ${deals.length} deals from deals.json`);
      
      try {
        // Set the main data source first
        allDealsData = deals;
        filteredDealsData = deals;
        console.log('Data set successfully');
        
        // Populate the top featured cards
        populateFeaturedDeals(deals);
        console.log('Featured deals populated');
        
        // Populate the top AAA games table
        populateTopAAAGames(deals);
        console.log('Top AAA games populated');
        
        // Set up interactive elements one by one with error handling
        try {
          setupSorting();
          console.log('Sorting setup complete');
        } catch (e) {
          console.error('Error in setupSorting:', e);
        }
        
        try {
          setupPagination();
          console.log('Pagination setup complete');
        } catch (e) {
          console.error('Error in setupPagination:', e);
        }
        
        try {
          setupCarouselControls();
          console.log('Carousel controls setup complete');
        } catch (e) {
          console.error('Error in setupCarouselControls:', e);
        }
        
        try {
          setupSearch();
          console.log('Search setup complete');
        } catch (e) {
          console.error('Error in setupSearch:', e);
        }
        
        // Perform initial sort and display the first page
        try {
          sortAllDealsData();
          displayPage(1);
          console.log('Initial display complete');
        } catch (e) {
          console.error('Error in initial display:', e);
        }
        
        // Hide loading states
        hideLoadingStates();
        
        console.log('App initialization complete');
      } catch (setupError) {
        console.error('Error during setup:', setupError);
        hideLoadingStates(); // Make sure to hide loading states even on error
        showErrorState(setupError);
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.error('Error fetching deals:', error);
      if (error.name === 'AbortError') {
        console.error('Request timed out after 10 seconds');
        showErrorState(new Error('Request timed out. Please refresh the page.'));
      } else {
        showErrorState(error);
      }
    });
}

// --- LOADING STATES ---
function showLoadingStates() {
  // Show skeleton for featured deals
  const featuredContainer = document.querySelector('.featured-deals');
  if (featuredContainer) {
    featuredContainer.innerHTML = createSkeletonFeaturedDeals();
  }
  
  // Show skeleton for deals table
  const tableBody = document.querySelector('.deals-table tbody');
  if (tableBody) {
    tableBody.innerHTML = createSkeletonTableRows();
  }
  
  // Hide pagination during loading
  const paginationContainer = document.getElementById('pagination-container');
  if (paginationContainer) {
    paginationContainer.innerHTML = '';
  }
}

function hideLoadingStates() {
  // Remove loading spinners from featured deals
  const featuredContainer = document.querySelector('.featured-deals');
  if (featuredContainer) {
    const loadingContainer = featuredContainer.querySelector('.loading-container');
    if (loadingContainer) {
      loadingContainer.remove();
    }
  }
  
  // Remove loading spinners from table
  const tableBody = document.querySelector('.deals-table tbody');
  if (tableBody) {
    const loadingRow = tableBody.querySelector('tr');
    if (loadingRow && loadingRow.querySelector('.loading-container')) {
      loadingRow.remove();
    }
  }
  
  console.log('Loading states hidden');
}

function showTableLoading() {
  const tableBody = document.querySelector('.deals-table tbody');
  if (tableBody) {
    tableBody.innerHTML = createSkeletonTableRows();
  }
}

function createSkeletonFeaturedDeals() {
  let skeletonHTML = '';
  for (let i = 0; i < 6; i++) { // Show 6 skeleton cards
    skeletonHTML += `
      <div class="skeleton-deal-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-price"></div>
          <div class="skeleton-meta"></div>
        </div>
      </div>
    `;
  }
  return skeletonHTML;
}

function createSkeletonTableRows() {
  let skeletonHTML = '';
  for (let i = 0; i < 10; i++) { // Show 10 skeleton rows
    skeletonHTML += `
      <tr class="skeleton-table-row">
        <td class="skeleton-table-cell"></td>
        <td class="skeleton-table-cell"></td>
        <td class="skeleton-table-cell"></td>
        <td class="skeleton-table-cell"></td>
        <td class="skeleton-table-cell"></td>
      </tr>
    `;
  }
  return skeletonHTML;
}

function showErrorState(error) {
  // Hide loading states
  hideLoadingStates();
  
  // Show error state for featured deals
  const featuredContainer = document.querySelector('.featured-deals');
  if (featuredContainer) {
    featuredContainer.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-message">Failed to load featured deals</div>
        <button class="error-retry-btn" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
  
  // Show error state for table
  const tableBody = document.querySelector('.deals-table tbody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-message">Failed to load deals data</div>
          <button class="error-retry-btn" onclick="location.reload()">Retry</button>
        </td>
      </tr>
    `;
  }
  
  console.error('Application error:', error);
}

// --- IMAGE ERROR HANDLING ---
function handleImageError(img) {
  // Try fallback to smaller image if high-res failed
  if (img.src.includes('capsule_616x353.jpg')) {
    img.src = img.src.replace('capsule_616x353.jpg', 'capsule_sm_120.jpg');
    return; // Let the image try to load the fallback
  }
  
  // If both failed, show broken state
  img.classList.add('broken');
  img.src = ''; // Clear the broken src
  img.alt = 'Game image unavailable';
}

function handleImageLoad(img) {
  img.classList.add('loaded');
}

// Function to create image with fallback
function createImageWithFallback(imageUrl, altText) {
  const img = new Image();
  img.alt = altText;
  img.className = 'deal-card__image';
  
  // Try high-res first, fallback to small if it fails
  const highResUrl = imageUrl.replace('capsule_sm_120.jpg', 'capsule_616x353.jpg');
  img.src = highResUrl;
  
  img.onerror = function() {
    handleImageError(this);
  };
  
  img.onload = function() {
    handleImageLoad(this);
  };
  
  return img;
}

function handleTableImageError(img) {
  // Try fallback to smaller image if high-res failed
  if (img.src.includes('capsule_616x353.jpg')) {
    img.src = img.src.replace('capsule_616x353.jpg', 'capsule_sm_120.jpg');
    return; // Let the image try to load the fallback
  }
  
  // If both failed, show fallback icon
  img.style.display = 'none';
  // Add fallback icon without removing the title
  const fallbackIcon = document.createElement('span');
  fallbackIcon.style.cssText = 'color: var(--text-muted); font-size: 12px; margin-right: 12px; display: inline-block; vertical-align: middle;';
  fallbackIcon.textContent = '🎮';
  img.parentElement.insertBefore(fallbackIcon, img.parentElement.firstChild);
}

// Function to create table image with fallback (for main deals table only)
function createTableImageWithFallback(imageUrl, altText) {
  const img = new Image();
  img.alt = altText;
  img.className = 'deals-table__thumbnail';
  
  // Try high-res first, fallback to original if it fails
  const highResUrl = imageUrl.replace('capsule_sm_120.jpg', 'capsule_616x353.jpg');
  img.src = highResUrl;
  
  img.onerror = function() {
    // Try the original URL
    img.src = imageUrl;
    img.onerror = function() {
      handleTableImageError(this);
    };
  };
  
  return img;
}

// --- UI POPULATION ---
function populateFeaturedDeals(deals) {
  const featuredContainer = document.querySelector('.featured-deals');
  if (!featuredContainer) return;
  featuredContainer.innerHTML = '';
  // Find the top 12 deals marked as featured
  const featuredDeals = deals.filter(deal => deal.featured).slice(0, 12);

  featuredDeals.forEach(deal => {
    const discount = Math.round(((deal.oldPrice - deal.price) / deal.oldPrice) * 100);
    
    // Create the card element
    const cardLink = document.createElement('a');
    cardLink.href = deal.url;
    cardLink.className = 'deal-card';
    cardLink.target = '_blank';
    cardLink.rel = 'noopener noreferrer';
    
    // Create image with fallback
    const img = createImageWithFallback(deal.imageUrl, deal.title);
    
    // Create card body
    const cardBody = document.createElement('div');
    cardBody.className = 'deal-card__body';
    cardBody.innerHTML = `
      <h3 class="deal-card__title">${deal.title}</h3>
      <div class="deal-card__price">$${deal.price.toFixed(2)}</div>
      <div class="deal-card__old-price">$${deal.oldPrice.toFixed(2)}</div>
      <div class="deal-card__meta">
        <span class="deal-card__discount">${discount}% OFF</span> • ${deal.platform} • ${deal.store}
      </div>
    `;
    
    // Assemble the card
    cardLink.appendChild(img);
    cardLink.appendChild(cardBody);
    featuredContainer.appendChild(cardLink);
  });
}

function populateTopAAAGames(deals) {
  const topAAATbody = document.getElementById('top-aaa-tbody');
  if (!topAAATbody) return;
  
  // Define most popular games to look for (focused on truly popular games)
  const popularGames = [
    // AAA Blockbusters (most popular)
    'Baldur\'s Gate 3', 'Cyberpunk 2077', 'Elden Ring', 'Hogwarts Legacy',
    'The Witcher 3', 'Red Dead Redemption 2', 'Grand Theft Auto V',
    'Call of Duty', 'FIFA', 'Assassin\'s Creed', 'Far Cry', 'Watch Dogs',
    'Battlefield', 'Destiny 2', 'Overwatch', 'Apex Legends', 'Fortnite',
    'Counter-Strike', 'Dota 2', 'League of Legends', 'World of Warcraft', 'Final Fantasy',
    'Resident Evil', 'Devil May Cry', 'Street Fighter', 'Tekken', 'Mortal Kombat',
    'God of War', 'Spider-Man', 'Horizon', 'Uncharted', 'The Last of Us', 'Ghost of Tsushima',
    'Diablo', 'Overwatch 2', 'Call of Duty: Modern Warfare', 'Call of Duty: Warzone',
    'FIFA 24', 'FIFA 23', 'NBA 2K', 'Madden NFL', 'Assassin\'s Creed Valhalla',
    'Assassin\'s Creed Mirage', 'Far Cry 6', 'Far Cry 5', 'Watch Dogs: Legion',
    'Battlefield 2042', 'Battlefield V', 'Counter-Strike 2', 'Counter-Strike: Global Offensive',
    'Final Fantasy XIV', 'Final Fantasy XVI', 'Resident Evil 4', 'Resident Evil Village',
    'Devil May Cry 5', 'Street Fighter 6', 'Tekken 8', 'Mortal Kombat 1',
    'Spider-Man: Miles Morales', 'Horizon Zero Dawn', 'Horizon Forbidden West',
    'Uncharted 4', 'The Last of Us Part I', 'The Last of Us Part II', 'Ghost of Tsushima',
    'Diablo IV', 'Diablo III',
    
    // Popular Indie & Viral Games (most popular)
    'Among Us', 'Minecraft', 'Palworld', 'Stardew Valley', 'Hades', 'Cuphead',
    'Celeste', 'Hollow Knight', 'Dead Cells', 'Terraria', 'Valheim', 'Rust',
    'ARK: Survival Evolved', 'Subnautica', 'Fall Guys', 'Phasmophobia', 'Lethal Company',
    'It Takes Two', 'A Way Out', 'Overcooked', 'Untitled Goose Game',
    
    // Popular Multiplayer Games (most popular)
    'Rocket League', 'Warframe', 'Genshin Impact', 'PUBG', 'Valorant', 'CS:GO',
    'Team Fortress 2', 'New World', 'New World: Aeternum',
    
    // Popular Strategy & Simulation (most popular)
    'Cities: Skylines', 'Civilization', 'Total War', 'Age of Empires', 'Sims',
    
    // Popular Horror & Survival (most popular)
    'Dead by Daylight', 'The Forest', '7 Days to Die', 'Don\'t Starve',
    'Left 4 Dead', 'Back 4 Blood', 'World War Z',
    
    // Popular Action & Adventure (most popular)
    'Monster Hunter', 'Dark Souls', 'Sekiro', 'Bloodborne', 'Demon\'s Souls',
    
    // Popular Racing & Sports (most popular)
    'Forza', 'Gran Turismo', 'F1', 'Need for Speed',
    
    // Popular RPGs (most popular)
    'Starfield', 'Fallout', 'Elder Scrolls', 'Mass Effect', 'Dragon Age'
  ];
  
  // Find deals for popular games with more precise matching (avoid DLCs/packs)
  const popularDeals = deals.filter(deal => {
    const title = deal.title.toLowerCase();
    
    // Skip DLCs, packs, expansions, and booster packs
    if (title.includes('dlc') || title.includes('pack') || title.includes('expansion') || 
        title.includes('season pass') || title.includes('bundle') || title.includes('collection') ||
        title.includes('edition') || title.includes('ultimate') || title.includes('gold') ||
        title.includes('premium') || title.includes('deluxe') || title.includes('complete') ||
        title.includes('booster') || title.includes('card') || title.includes('trading') ||
        title.includes('starter') || title.includes('upgrade') || title.includes('add-on') ||
        title.includes('skin') || title.includes('cosmetic') || title.includes('weapon') ||
        title.includes('character') || title.includes('hero') || title.includes('champion')) {
      return false;
    }
    
    return popularGames.some(popularGame => {
      const gameName = popularGame.toLowerCase();
      // More precise matching - exact match or starts with the game name followed by space/colon/dash
      return title === gameName || 
             title.startsWith(gameName + ' ') || 
             title.startsWith(gameName + ':') || 
             title.startsWith(gameName + ' -');
    });
  });
  
  // Debug: Log found popular games
  console.log('Found popular games:', popularDeals.map(deal => deal.title));
  
  // Sort by discount percentage (highest first) - we'll paginate this
  const sortedPopularDeals = popularDeals.sort((a, b) => {
    const discountA = Math.round(((a.oldPrice - a.price) / a.oldPrice) * 100);
    const discountB = Math.round(((b.oldPrice - b.price) / b.oldPrice) * 100);
    return discountB - discountA;
  });
  
  // Store the data globally for pagination
  popularGamesData = sortedPopularDeals;
  
  // Display the current page
  displayPopularGamesPage(popularCurrentPage);
}

function displayPopularGamesPage(page) {
  const topAAATbody = document.getElementById('top-aaa-tbody');
  if (!topAAATbody) return;
  
  topAAATbody.innerHTML = ''; // Clear existing rows
  
  if (popularGamesData.length === 0) {
    // Fallback: Show top deals by discount if no popular games found
    console.log('No popular games found, showing top deals by discount');
    const topDeals = allDealsData
      .sort((a, b) => {
        const discountA = Math.round(((a.oldPrice - a.price) / a.oldPrice) * 100);
        const discountB = Math.round(((b.oldPrice - b.price) / b.oldPrice) * 100);
        return discountB - discountA;
      })
      .slice(0, 10);
    
    // Use the top deals instead
    topDeals.forEach(deal => {
      const discount = Math.round(((deal.oldPrice - deal.price) / deal.oldPrice) * 100);
      
      // Create table row
      const row = document.createElement('tr');
      row.className = 'top-aaa-table__row';
      
      // Create title cell with link only (no image)
      const titleCell = document.createElement('td');
      titleCell.className = 'top-aaa-table__cell top-aaa-table__cell--left';
      
      // Create link
      const link = document.createElement('a');
      link.href = deal.url;
      link.className = 'top-aaa-table__link';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = deal.title;
      
      titleCell.appendChild(link);
      
      // Create other cells
      const platformCell = document.createElement('td');
      platformCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
      platformCell.textContent = deal.platform || 'PC';
      
      const priceCell = document.createElement('td');
      priceCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
      priceCell.innerHTML = `
        <div class="top-aaa-table__price">$${deal.price}</div>
        <div class="top-aaa-table__old-price">$${deal.oldPrice}</div>
      `;
      
      const discountCell = document.createElement('td');
      discountCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
      discountCell.innerHTML = `<span class="top-aaa-table__discount">-${discount}%</span>`;
      
      const storeCell = document.createElement('td');
      storeCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
      storeCell.textContent = deal.store || 'Unknown';
      
      // Assemble row
      row.appendChild(titleCell);
      row.appendChild(platformCell);
      row.appendChild(priceCell);
      row.appendChild(discountCell);
      row.appendChild(storeCell);
      
      topAAATbody.appendChild(row);
    });
    return;
  }
  
  // Calculate pagination
  const startIndex = (page - 1) * popularItemsPerPage;
  const endIndex = startIndex + popularItemsPerPage;
  const pageDeals = popularGamesData.slice(startIndex, endIndex);
  
  // Display deals for this page
  pageDeals.forEach(deal => {
    const discount = Math.round(((deal.oldPrice - deal.price) / deal.oldPrice) * 100);
    
    // Create table row
    const row = document.createElement('tr');
    row.className = 'top-aaa-table__row';
    
      // Create title cell with link only (no image)
      const titleCell = document.createElement('td');
      titleCell.className = 'top-aaa-table__cell top-aaa-table__cell--left';
      
      // Create link
      const link = document.createElement('a');
      link.href = deal.url;
      link.className = 'top-aaa-table__link';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = deal.title;
      
      titleCell.appendChild(link);
    
    // Create other cells
    const platformCell = document.createElement('td');
    platformCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
    platformCell.textContent = deal.platform;
    
    const priceCell = document.createElement('td');
    priceCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
    priceCell.innerHTML = `
      <span class="top-aaa-table__price">$${deal.price.toFixed(2)}</span>
      <div class="top-aaa-table__old-price">$${deal.oldPrice.toFixed(2)}</div>
    `;
    
    const discountCell = document.createElement('td');
    discountCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
    discountCell.innerHTML = `<span class="top-aaa-table__discount">${discount}% OFF</span>`;
    
    const storeCell = document.createElement('td');
    storeCell.className = 'top-aaa-table__cell top-aaa-table__cell--center';
    storeCell.textContent = deal.store;
    
    // Assemble row
    row.appendChild(titleCell);
    row.appendChild(platformCell);
    row.appendChild(priceCell);
    row.appendChild(discountCell);
    row.appendChild(storeCell);
    
    topAAATbody.appendChild(row);
  });
  
  // Add pagination controls
  setupPopularGamesPagination();
}

function setupPopularGamesPagination() {
  const totalPages = Math.ceil(popularGamesData.length / popularItemsPerPage);
  
  // Remove existing pagination
  const existingPagination = document.querySelector('.popular-games-pagination');
  if (existingPagination) {
    existingPagination.remove();
  }
  
  if (totalPages <= 1) return; // No pagination needed
  
  // Create pagination container
  const paginationContainer = document.createElement('div');
  paginationContainer.className = 'popular-games-pagination';
  paginationContainer.style.cssText = 'text-align: center; margin-top: 20px; padding: 20px;';
  
  // Previous button
  const prevButton = document.createElement('button');
  prevButton.textContent = '←';
  prevButton.disabled = popularCurrentPage === 1;
  prevButton.style.cssText = 'margin: 0 5px; padding: 8px 12px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;';
  prevButton.onclick = () => {
    if (popularCurrentPage > 1) {
      popularCurrentPage--;
      displayPopularGamesPage(popularCurrentPage);
    }
  };
  
  // Page numbers
  const pageNumbers = document.createElement('span');
  pageNumbers.textContent = `Page ${popularCurrentPage} of ${totalPages}`;
  pageNumbers.style.cssText = 'margin: 0 15px; color: var(--text-color);';
  
  // Next button
  const nextButton = document.createElement('button');
  nextButton.textContent = '→';
  nextButton.disabled = popularCurrentPage === totalPages;
  nextButton.style.cssText = 'margin: 0 5px; padding: 8px 12px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;';
  nextButton.onclick = () => {
    if (popularCurrentPage < totalPages) {
      popularCurrentPage++;
      displayPopularGamesPage(popularCurrentPage);
    }
  };
  
  // Assemble pagination
  paginationContainer.appendChild(prevButton);
  paginationContainer.appendChild(pageNumbers);
  paginationContainer.appendChild(nextButton);
  
  // Insert after the table
  const tableContainer = document.querySelector('.top-aaa-container');
  if (tableContainer) {
    tableContainer.appendChild(paginationContainer);
  }
}

function populateDealsTable(deals, tableBody) {
  if (!tableBody) return;
  tableBody.innerHTML = ''; // Clear existing rows

  deals.forEach(deal => {
    const discount = Math.round(((deal.oldPrice - deal.price) / deal.oldPrice) * 100);
    
    // Create table row
    const row = document.createElement('tr');
    row.className = 'deals-table__row';
    
    // Create title cell with image and link
    const titleCell = document.createElement('td');
    titleCell.className = 'deals-table__cell deals-table__cell--left';
    
    const titleContainer = document.createElement('div');
    titleContainer.className = 'deals-table__title-container';
    
    // Create image with fallback
    const img = createTableImageWithFallback(deal.imageUrl, deal.title);
    
    // Create link
    const link = document.createElement('a');
    link.href = deal.url;
    link.className = 'deals-table__link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = deal.title;
    
    // Assemble title container
    titleContainer.appendChild(img);
    titleContainer.appendChild(link);
    titleCell.appendChild(titleContainer);
    
    // Create other cells
    const platformCell = document.createElement('td');
    platformCell.className = 'deals-table__cell deals-table__cell--center';
    platformCell.textContent = deal.platform;
    
    const priceCell = document.createElement('td');
    priceCell.className = 'deals-table__cell deals-table__cell--center';
    priceCell.innerHTML = `
      <span class="deals-table__price">$${deal.price.toFixed(2)}</span>
      <div class="deals-table__old-price">$${deal.oldPrice.toFixed(2)}</div>
    `;
    
    const discountCell = document.createElement('td');
    discountCell.className = 'deals-table__cell deals-table__cell--center';
    discountCell.innerHTML = `<span class="deals-table__discount">${discount}% OFF</span>`;
    
    const storeCell = document.createElement('td');
    storeCell.className = 'deals-table__cell deals-table__cell--center';
    storeCell.textContent = deal.store;
    
    // Assemble row
    row.appendChild(titleCell);
    row.appendChild(platformCell);
    row.appendChild(priceCell);
    row.appendChild(discountCell);
    row.appendChild(storeCell);
    
    tableBody.appendChild(row);
  });
}

// --- CAROUSEL CONTROLS ---
function setupCarouselControls() {
  const scrollContainer = document.querySelector('.featured-deals');
  const leftBtn = document.getElementById('scroll-left-btn');
  const rightBtn = document.getElementById('scroll-right-btn');

  if (!scrollContainer || !leftBtn || !rightBtn) return;

  // Drag functionality variables
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasDragged = false;
  let dragThreshold = 5; // Minimum pixels to move before considering it a drag

  // Function to get the appropriate scroll amount based on screen size
  function getScrollAmount() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // On mobile, scroll by 3 cards (280px * 3 + 16px * 2 = 872px)
      return 872;
    } else {
      // On desktop, scroll by 4 cards (300px * 4 + 20px * 3 = 1260px)
      return 1260;
    }
  }

  // Function to scroll smoothly
  function smoothScrollTo(targetScrollLeft) {
    scrollContainer.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    });
  }

  rightBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!hasDragged) { // Only scroll if user didn't drag
      const scrollAmount = getScrollAmount();
      const newScrollLeft = scrollContainer.scrollLeft + scrollAmount;
      smoothScrollTo(newScrollLeft);
    }
  });

  leftBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!hasDragged) { // Only scroll if user didn't drag
      const scrollAmount = getScrollAmount();
      const newScrollLeft = scrollContainer.scrollLeft - scrollAmount;
      smoothScrollTo(newScrollLeft);
    }
  });

  // Update button visibility based on scroll position
  function updateButtonVisibility() {
    const isAtStart = scrollContainer.scrollLeft <= 0;
    const isAtEnd = scrollContainer.scrollLeft >= 
      (scrollContainer.scrollWidth - scrollContainer.clientWidth - 10);

    leftBtn.style.opacity = isAtStart ? '0.5' : '1';
    rightBtn.style.opacity = isAtEnd ? '0.5' : '1';
    
    leftBtn.style.pointerEvents = isAtStart ? 'none' : 'auto';
    rightBtn.style.pointerEvents = isAtEnd ? 'none' : 'auto';
  }

  // Listen for scroll events to update button visibility
  scrollContainer.addEventListener('scroll', updateButtonVisibility);
  
  // Initial button state
  updateButtonVisibility();

  // Update on window resize
  window.addEventListener('resize', () => {
    updateButtonVisibility();
  });

  // Mouse drag functionality
  function handleMouseDown(e) {
    isDragging = true;
    hasDragged = false;
    scrollContainer.classList.add('dragging');
    scrollContainer.style.cursor = 'grabbing';
    scrollContainer.style.scrollBehavior = 'auto'; // Disable smooth scroll during drag
    startX = e.pageX - scrollContainer.offsetLeft;
    scrollLeft = scrollContainer.scrollLeft;
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = x - startX;
    
    // Only consider it a drag if moved more than threshold
    if (Math.abs(walk) > dragThreshold) {
      hasDragged = true;
    }
    
    // Smooth continuous scrolling with reduced sensitivity for better control
    scrollContainer.scrollLeft = scrollLeft - (walk * 0.8);
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      scrollContainer.classList.remove('dragging');
      scrollContainer.style.cursor = 'grab';
      scrollContainer.style.scrollBehavior = 'smooth'; // Re-enable smooth scroll
      updateButtonVisibility();
      
      // Reset hasDragged flag after a short delay to allow normal clicking
      setTimeout(() => {
        hasDragged = false;
      }, 100);
    }
  }

  function handleMouseLeave() {
    if (isDragging) {
      handleMouseUp();
    }
  }

  // Touch drag functionality
  function handleTouchStart(e) {
    isDragging = true;
    hasDragged = false;
    scrollContainer.classList.add('dragging');
    scrollContainer.style.scrollBehavior = 'auto'; // Disable smooth scroll during drag
    startX = e.touches[0].pageX - scrollContainer.offsetLeft;
    scrollLeft = scrollContainer.scrollLeft;
  }

  function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const x = e.touches[0].pageX - scrollContainer.offsetLeft;
    const walk = x - startX;
    
    // Only consider it a drag if moved more than threshold
    if (Math.abs(walk) > dragThreshold) {
      hasDragged = true;
    }
    
    // Smooth continuous scrolling with reduced sensitivity for better control
    scrollContainer.scrollLeft = scrollLeft - (walk * 0.8);
  }

  function handleTouchEnd() {
    if (isDragging) {
      isDragging = false;
      scrollContainer.classList.remove('dragging');
      scrollContainer.style.scrollBehavior = 'smooth'; // Re-enable smooth scroll
      updateButtonVisibility();
      
      // Reset hasDragged flag after a short delay to allow normal clicking
      setTimeout(() => {
        hasDragged = false;
      }, 100);
    }
  }

  // Prevent accidental clicks on deal cards when dragging
  function preventCardClicks(e) {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  // Add event listeners for mouse drag
  scrollContainer.addEventListener('mousedown', handleMouseDown);
  scrollContainer.addEventListener('mousemove', handleMouseMove);
  scrollContainer.addEventListener('mouseup', handleMouseUp);
  scrollContainer.addEventListener('mouseleave', handleMouseLeave);

  // Add event listeners for touch drag
  scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
  scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  scrollContainer.addEventListener('touchend', handleTouchEnd);

  // Prevent default drag behavior on images and links
  scrollContainer.addEventListener('dragstart', (e) => e.preventDefault());
  
  // Prevent clicks on deal cards when dragging
  scrollContainer.addEventListener('click', preventCardClicks, true);
  
  // Add grab cursor style
  scrollContainer.style.cursor = 'grab';
}

// --- SEARCH FUNCTIONALITY ---
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search-btn');
  
  if (!searchInput || !clearBtn) return;
  
  // Search input event listener
  searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.toLowerCase().trim();
    performSearch();
  });
  
  // Clear button event listener
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchTerm = '';
    clearBtn.style.display = 'none';
    performSearch();
  });
  
  // Show/hide clear button based on input
  searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
  });
}

function performSearch() {
  if (currentSearchTerm === '') {
    // Show all deals
    filteredDealsData = [...allDealsData];
  } else {
    // Filter deals by search term
    filteredDealsData = allDealsData.filter(deal => 
      deal.title.toLowerCase().includes(currentSearchTerm)
    );
  }
  
  // Reset to first page and update display
  currentPage = 1;
  sortAllDealsData();
  displayPage(1);
  updatePaginationUI();
  
  // Show no results message if needed
  showNoResultsMessage();
}

function showNoResultsMessage() {
  const tableContainer = document.querySelector('.deals-table--container');
  const existingMessage = document.querySelector('.no-results-message');
  
  // Remove existing message
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Show message if no results and search term exists
  if (filteredDealsData.length === 0 && currentSearchTerm !== '') {
    const message = document.createElement('div');
    message.className = 'no-results-message';
    message.innerHTML = `
      <div>No deals found for "<span class="search-term">${currentSearchTerm}</span>"</div>
      <div style="margin-top: 8px; font-size: 14px;">This game may not currently be on sale.</div>
    `;
    
    // Insert message after the table container
    tableContainer.parentNode.insertBefore(message, tableContainer.nextSibling);
  }
}

// --- SORTING LOGIC ---
function sortAllDealsData() {
    const { column, direction } = dealsSort;
    filteredDealsData.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // Special handling for discount column - calculate percentage
        if (column === 'discount') {
            valA = Math.round(((a.oldPrice - a.price) / a.oldPrice) * 100);
            valB = Math.round(((b.oldPrice - b.price) / b.oldPrice) * 100);
        }
        
        if (typeof valA === 'number') {
            return direction === 'asc' ? valA - valB : valB - valA;
        }
        return direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
}

function setupSorting() {
    const headers = document.querySelectorAll('.deals-table th');
    const columnMapping = ['title', 'platform', 'price', 'discount', 'store'];

    headers.forEach((header, index) => {
        header.classList.add('sortable-header');
        const arrow = document.createElement('span');
        arrow.classList.add('sort-arrow');
        header.appendChild(arrow);

        header.addEventListener('click', () => {
            const sortKey = columnMapping[index];
            const newDirection = (dealsSort.column === sortKey && dealsSort.direction === 'asc') ? 'desc' : 'asc';
            dealsSort = { column: sortKey, direction: newDirection };
            
            // Show loading state for table during sort
            const tableBody = document.querySelector('.deals-table tbody');
            if (tableBody) {
                tableBody.innerHTML = createSkeletonTableRows();
            }
            
            // Use setTimeout to allow UI to update before sorting
            setTimeout(() => {
                sortAllDealsData();
                displayPage(1); // Go to first page of sorted results
                updateSortHeaders();
            }, 100);
        });
    });
    updateSortHeaders(); // Set initial arrow
}

function updateSortHeaders() {
    const headers = document.querySelectorAll('.deals-table th');
    const columnMapping = ['title', 'platform', 'price', 'discount', 'store'];
    headers.forEach((h, i) => {
        h.classList.remove('sort-asc', 'sort-desc');
        if (columnMapping[i] === dealsSort.column) {
            h.classList.add(`sort-${dealsSort.direction}`);
        }
    });
}

// --- PAGINATION LOGIC ---
function displayPage(page) {
  currentPage = page;
  const tableBody = document.querySelector('.deals-table tbody');
  const startIndex = (page - 1) * dealsPerPage;
  const endIndex = startIndex + dealsPerPage;
  const paginatedDeals = filteredDealsData.slice(startIndex, endIndex);
  populateDealsTable(paginatedDeals, tableBody);
  setupPagination(); // Recreate pagination with new current page
}

function setupPagination() {
  const container = document.getElementById('pagination-container');
  if (!container) return;
  container.innerHTML = '';
  const pageCount = Math.ceil(filteredDealsData.length / dealsPerPage);

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '&larr;';
  prevButton.classList.add('pagination-button');
  prevButton.addEventListener('click', () => { 
    if (currentPage > 1) {
      showTableLoading();
      setTimeout(() => displayPage(currentPage - 1), 100);
    }
  });
  container.appendChild(prevButton);

  // Smart pagination logic
  const createPageLink = (pageNum) => {
    const pageLink = document.createElement('a');
    pageLink.href = '#';
    pageLink.textContent = pageNum;
    pageLink.classList.add('pagination-link');
    if (pageNum === currentPage) pageLink.classList.add('pagination-link--active');
    pageLink.addEventListener('click', (e) => { 
      e.preventDefault(); 
      showTableLoading();
      setTimeout(() => displayPage(pageNum), 100);
    });
    return pageLink;
  };

  const createEllipsis = () => {
    const ellipsis = document.createElement('span');
    ellipsis.textContent = '...';
    ellipsis.classList.add('pagination-ellipsis');
    return ellipsis;
  };

  // Always show first page
  container.appendChild(createPageLink(1));

  if (pageCount <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 2; i <= pageCount - 1; i++) {
      container.appendChild(createPageLink(i));
    }
  } else {
    // Smart pagination for more than 7 pages
    if (currentPage <= 3) {
      // Show: 1 2 3 4 5 ... last
      for (let i = 2; i <= 5; i++) {
        container.appendChild(createPageLink(i));
      }
      container.appendChild(createEllipsis());
    } else if (currentPage >= pageCount - 2) {
      // Show: 1 ... (last-4) (last-3) (last-2) (last-1) last
      container.appendChild(createEllipsis());
      for (let i = pageCount - 4; i <= pageCount - 1; i++) {
        container.appendChild(createPageLink(i));
      }
    } else {
      // Show: 1 ... (current-2) (current-1) current (current+1) (current+2) ... last
      container.appendChild(createEllipsis());
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        container.appendChild(createPageLink(i));
      }
      container.appendChild(createEllipsis());
    }
  }

  // Always show last page (if more than 1 page)
  if (pageCount > 1) {
    container.appendChild(createPageLink(pageCount));
  }

  // Next button
  const nextButton = document.createElement('button');
  nextButton.innerHTML = '&rarr;';
  nextButton.classList.add('pagination-button');
  nextButton.addEventListener('click', () => { 
    if (currentPage < pageCount) {
      showTableLoading();
      setTimeout(() => displayPage(currentPage + 1), 100);
    }
  });
  container.appendChild(nextButton);
}

function updatePaginationUI() {
  const pageCount = Math.ceil(filteredDealsData.length / dealsPerPage);
  const prevButton = document.querySelector('#pagination-container .pagination-button:first-of-type');
  const nextButton = document.querySelector('#pagination-container .pagination-button:last-of-type');

  if(prevButton) prevButton.disabled = currentPage === 1;
  if(nextButton) nextButton.disabled = currentPage === pageCount;

  document.querySelectorAll('.pagination-link').forEach(link => {
    link.classList.remove('pagination-link--active');
    if (parseInt(link.textContent) === currentPage) {
      link.classList.add('pagination-link--active');
    }
  });
}
