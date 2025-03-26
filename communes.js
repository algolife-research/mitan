const searchHTML = `
  <div id="searchContainer">
    <input type="text" id="searchInput" placeholder="Code postal ou Commune" />
    <div id="autocompleteList" class="autocomplete-list"></div>
    <div id="searchResult"></div>
  </div>
`;

// Append the search element to the #searchSection in index.qmd
$('#searchSection').append(searchHTML);

// Handle input for autocomplete
$('#searchInput').on('input', () => {
  const query = $('#searchInput').val().trim();
  if (!query) {
    $('#autocompleteList').empty();
    return;
  }

  // Query the gouv API for autocomplete suggestions
  fetch(`https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux&boost=population&limit=5&${isNaN(query) ? `nom=${query}` : `codePostal=${query}`}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.length === 0) {
        $('#autocompleteList').html('<div class="no-results">Aucune commune trouvée.</div>');
        return;
      }

      // Display suggestions in a custom dropdown
      const suggestionsHTML = data.map(({ nom, code, codesPostaux }) => {
        const codePostal = codesPostaux && codesPostaux.length > 0 ? codesPostaux[0] : 'N/A';
        return `<div class="autocomplete-item" data-code="${code}" data-value="${nom}">${codePostal} - ${nom}</div>`;
      }).join('');
      $('#autocompleteList').html(suggestionsHTML);

      // Add click event to each suggestion item
      $('.autocomplete-item').on('click', function () {
        const selectedCode = $(this).data('code');
        window.location.href = `./carte.html?commune=${selectedCode}`;
      });
    })
    .catch(error => {
      console.error("Error querying API for autocomplete:", error);
    });
});

// Close the dropdown when clicking outside
$(document).on('click', function (e) {
  if (!$(e.target).closest('#searchContainer').length) {
    $('#autocompleteList').empty();
  }
});