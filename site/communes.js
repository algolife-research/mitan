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

        // Build a single HTML string for all rows
        let rowsHTML = '';
        rows.forEach(row => {
          const [code, nom] = row;
          rowsHTML += `<tr><td>${code}</td><td><a href="./carte.html?commune=${code}">${nom}</a></td></tr>`;
        });

        // Inject all rows at once
        $tbody.html(rowsHTML);

        // Initialize DataTables with French language options
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

        // Hide the loading widget
        $('#loading').hide();
      })
      .catch(error => {
        console.error("Error loading CSV file:", error);
        $('#loading').html("Error loading data.");
      });