// Function to parse CSV text
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(line => line.split(','));
  return { headers, rows };
}

// Fetch the CSV file and populate the table
fetch('comm_list.csv')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    return response.text();
  })
  .then(csvText => {
    const { rows } = parseCSV(csvText);
    const $tbody = $('#communeTable tbody');

    rows.forEach(row => {
      const [code, nom] = row;
      const link = `<a href="./carte.html?commune=${code}">${nom}</a>`;
      $tbody.append(`<tr><td>${code}</td><td>${link}</td></tr>`);
    });

    // Initialize DataTables (with French language options if desired)
    $('#communeTable').DataTable({
      language: {
        search: "Rechercher:",
        lengthMenu: "Afficher _MENU_ entrées",
        info: "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
        paginate: {
          previous: "Précédent",
          next: "Suivant"
        }
      }
    });
  })
  .catch(error => console.error("Error loading CSV file:", error));
