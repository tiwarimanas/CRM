$(document).ready(function() {
    // Global CRM data structure with profile, inventory, sales, and bills
    var crmData = {
      profile: {},
      inventory: [],
      sales: [],
      bills: []
    };
  
    // Counters for unique IDs
    var inventoryCounter = 1, salesCounter = 1, billCounter = 1;
  
    // Load data from local storage if available
    function loadData() {
      var storedData = localStorage.getItem('crmData');
      if(storedData) {
        crmData = JSON.parse(storedData);
        inventoryCounter = crmData.inventory.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        salesCounter = crmData.sales.reduce((max, sale) => Math.max(max, sale.id), 0) + 1;
        billCounter = crmData.bills.reduce((max, bill) => Math.max(max, bill.id), 0) + 1;
      }
    }
    loadData();
  
    // Save current CRM data to local storage
    function saveData() {
      localStorage.setItem('crmData', JSON.stringify(crmData));
    }
  
    // Pre-populate profile form if data exists
    function populateProfileForm() {
      if(crmData.profile) {
        $("#companyName").val(crmData.profile.name || "");
        $("#companyAddress").val(crmData.profile.address || "");
        $("#companyEmail").val(crmData.profile.email || "");
        $("#companyCurrency").val(crmData.profile.currency || "");
      }
    }
    populateProfileForm();
  
    // Update dashboard counts
    function updateDashboard() {
      $("#inventoryCount").text(crmData.inventory.length);
      $("#salesCount").text(crmData.sales.length);
      $("#billsCount").text(crmData.bills.length);
    }
  
    // Update inventory table and refresh dropdowns
    function updateInventoryTable() {
      var tbody = $("#inventoryTableBody");
      tbody.empty();
      $.each(crmData.inventory, function(index, item) {
        tbody.append("<tr><td>" + item.id + "</td><td>" + item.name + "</td><td>" + item.quantity + "</td><td>" + item.price + "</td></tr>");
      });
      updateSalesProductDropdown();
      updateDashboard();
      saveData();
    }
  
    // Update sales table
    function updateSalesTable() {
      var tbody = $("#salesTableBody");
      tbody.empty();
      $.each(crmData.sales, function(index, sale) {
        tbody.append("<tr><td>" + sale.id + "</td><td>" + sale.customer + "</td><td>" + sale.product + "</td><td>" + sale.quantity + "</td><td>" + sale.date + "</td></tr>");
      });
      updateDashboard();
      saveData();
    }
  
    // Update billing table with a PDF generation button for each bill
    function updateBillingTable() {
      var tbody = $("#billingTableBody");
      tbody.empty();
      $.each(crmData.bills, function(index, bill) {
        var itemsHtml = "";
        $.each(bill.items, function(i, item) {
          itemsHtml += item.product + " (Qty: " + item.quantity + ")<br>";
        });
        tbody.append(
          "<tr>" +
            "<td>" + bill.id + "</td>" +
            "<td>" + bill.customer + "</td>" +
            "<td>" + itemsHtml + "</td>" +
            "<td>" + bill.total.toFixed(2) + "</td>" +
            "<td>" + bill.date + "</td>" +
            "<td><button class='btn btn-dark btn-rounded generate-pdf' data-billid='" + bill.id + "'><i class='bi bi-file-earmark-pdf'></i> Generate PDF</button></td>" +
          "</tr>"
        );
      });
      updateDashboard();
      saveData();
    }
  
    // Refresh the sales product dropdown based on inventory
    function updateSalesProductDropdown() {
      var dropdown = $("#salesProduct");
      dropdown.empty();
      dropdown.append('<option value="">Select Product</option>');
      $.each(crmData.inventory, function(index, item) {
        dropdown.append('<option value="'+ item.id +'">'+ item.name +'</option>');
      });
    }
  
    // Handle profile form submission and save company info including currency
    $("#profileForm").submit(function(e) {
      e.preventDefault();
      var name = $("#companyName").val();
      var address = $("#companyAddress").val();
      var email = $("#companyEmail").val();
      var currency = $("#companyCurrency").val();
      if(name && address && email && currency) {
        crmData.profile = { name: name, address: address, email: email, currency: currency };
        alert("Profile saved successfully!");
        saveData();
      }
    });
  
    // Add an inventory item
    $("#inventoryForm").submit(function(e) {
      e.preventDefault();
      var name = $("#inventoryName").val();
      var quantity = parseInt($("#inventoryQuantity").val());
      var price = parseFloat($("#inventoryPrice").val());
      if(name && !isNaN(quantity) && !isNaN(price)) {
        var item = { id: inventoryCounter++, name: name, quantity: quantity, price: price };
        crmData.inventory.push(item);
        updateInventoryTable();
        $("#inventoryForm")[0].reset();
      }
    });
  
    // Record a sale and automatically generate a bill (requires a completed profile)
    $("#salesForm").submit(function(e) {
      e.preventDefault();
      if(!crmData.profile || !crmData.profile.name) {
        alert("Please complete your company profile before recording sales and generating bills.");
        return;
      }
      var customer = $("#customerNameSale").val();
      var productId = $("#salesProduct").val();
      var quantity = parseInt($("#salesQuantity").val());
      if(customer && productId && !isNaN(quantity)) {
        var product = crmData.inventory.find(function(item) { return item.id == productId; });
        if(product) {
          if(product.quantity >= quantity) {
            product.quantity -= quantity;
            var sale = {
              id: salesCounter++,
              customer: customer,
              product: product.name,
              quantity: quantity,
              date: new Date().toLocaleString()
            };
            crmData.sales.push(sale);
            updateInventoryTable();
            updateSalesTable();
  
            // Auto-generate a bill from the sale
            var bill = {
              id: billCounter++,
              customer: customer,
              items: [{
                product: product.name,
                quantity: quantity,
                price: product.price
              }],
              total: product.price * quantity,
              date: new Date().toLocaleString()
            };
            crmData.bills.push(bill);
            updateBillingTable();
            $("#salesForm")[0].reset();
          } else {
            alert("Insufficient inventory quantity!");
          }
        }
      }
    });
  
    // PDF generation using jsPDF and autoTable for enhanced design
    $("#billingTableBody").on("click", ".generate-pdf", function() {
      var billId = $(this).data("billid");
      generatePDF(billId);
    });
  
    function generatePDF(billId) {
      var bill = crmData.bills.find(function(b) { return b.id == billId; });
      if(!bill) return;
      var profile = crmData.profile;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
  
      // Header design with colored background
      doc.setFillColor(33, 37, 41); // dark color
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text(profile.name || "Company Name", 105, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text(profile.address || "Company Address", 105, 22, { align: "center" });
      doc.text("Email: " + (profile.email || ""), 105, 27, { align: "center" });
      doc.setTextColor(0, 0, 0);
  
      // Bill Title
      doc.setFontSize(14);
      doc.text("Bill Receipt", 105, 40, { align: "center" });
  
      // Bill details
      doc.setFontSize(10);
      doc.text("Bill ID: " + bill.id, 14, 50);
      doc.text("Customer: " + bill.customer, 14, 56);
      doc.text("Date: " + bill.date, 14, 62);
  
      // Prepare table data for bill items
      var tableColumn = ["Product", "Quantity", "Price (" + (profile.currency || "USD") + ")", "Amount (" + (profile.currency || "USD") + ")"];
      var tableRows = [];
      bill.items.forEach(function(item) {
        var amount = item.price * item.quantity;
        var row = [
          item.product,
          item.quantity.toString(),
          item.price.toFixed(2),
          amount.toFixed(2)
        ];
        tableRows.push(row);
      });
  
      // Generate table using autoTable
      doc.autoTable({
        startY: 70,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [33, 37, 41] },
        styles: { fontSize: 10 }
      });
  
      // Add total amount
      var finalY = doc.lastAutoTable.finalY || 70;
      doc.text("Total: " + (profile.currency || "USD") + " " + bill.total.toFixed(2), 14, finalY + 10);
  
      // Save PDF file
      doc.save("Bill_" + bill.id + ".pdf");
    }
  
    // Data Export/Import functions
    $("#exportData").click(function() {
      var dataStr = JSON.stringify(crmData, null, 4);
      var blob = new Blob([dataStr], {type: "application/json"});
      saveAs(blob, "crm_data.json");
    });
  
    $("#importData").click(function() {
      var fileInput = $("#importDataFile")[0];
      if(fileInput.files.length === 0) {
        alert("Please select a JSON file to import.");
        return;
      }
      var file = fileInput.files[0];
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var importedData = JSON.parse(e.target.result);
          if(importedData.inventory && importedData.sales && importedData.bills && importedData.profile) {
            crmData = importedData;
            inventoryCounter = crmData.inventory.reduce((max, item) => Math.max(max, item.id), 0) + 1;
            salesCounter = crmData.sales.reduce((max, sale) => Math.max(max, sale.id), 0) + 1;
            billCounter = crmData.bills.reduce((max, bill) => Math.max(max, bill.id), 0) + 1;
            updateInventoryTable();
            updateSalesTable();
            updateBillingTable();
            populateProfileForm();
            alert("Data imported successfully!");
          } else {
            alert("Invalid data structure in JSON file.");
          }
        } catch(err) {
          alert("Error parsing JSON file: " + err);
        }
      };
      reader.readAsText(file);
    });
  
    // Clear all data from local storage after user confirmation
    $("#clearData").click(function() {
      if(confirm("Are you sure you want to clear all data? Make sure you have exported your backup as JSON.")) {
        localStorage.removeItem('crmData');
        // Reset CRM data and counters
        crmData = { profile: {}, inventory: [], sales: [], bills: [] };
        inventoryCounter = 1;
        salesCounter = 1;
        billCounter = 1;
        updateInventoryTable();
        updateSalesTable();
        updateBillingTable();
        populateProfileForm();
        updateDashboard();
        alert("All data cleared!");
      }
    });
  
    // Initial updates on page load
    updateInventoryTable();
    updateSalesTable();
    updateBillingTable();
    updateDashboard();
  });
  
