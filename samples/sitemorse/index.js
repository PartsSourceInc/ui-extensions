(() => {
  let ui;
  let smartviewurl = '';
  let reporturl = '';
  let instances_collapsible;
  let instances_modal;
  let instances_tooltip;

  async function initExtension() {
    try {
      ui = await UiExtension.register();
      document.getElementById('smartview').onclick = openSmartview;
      document.getElementById('report').onclick = openReport;

      ui.channel.page.get().then(showAnalytics);
      ui.channel.page.on('navigate', showAnalytics);

    } catch(error) {
      console.error('Failed to register extension:', error.message);
      console.error('- error code:', error.code);
    }
  }

  function openSmartview() {
    window.open(smartviewurl, '_blank');
  }
  function openReport() {
    window.open(reporturl, '_blank');
  }

  function displayPanel(id, show) {
    if (show) {
      document.getElementById(id).classList.remove("hide");
    } else {
      document.getElementById(id).classList.add("hide");
    }
  }

  function showAnalytics(page) {

    displayPanel('info', false);
    displayPanel('error', false);
    let dialogRef = openDialog();
    
    //Prep config data
    const config = JSON.parse(ui.extension.config);
    const sitemorseUrl = config.sitemorseUrl || "";
    const previewmountname = config.previewMountName || "";
    const token = config.sitemorseToken || "";
    if (token === "") {
      console.error("No Sitemorse token found in config");
      displayPanel('error', true);
      closeDialog(dialogRef);
      return;
    }

    let searchurl = page.url;

    //Replacing url to include preview mount, if there is one
    searchurl = page.path != "/" ? page.url.replace(page.path, "/") + previewmountname + page.path : page.url + previewmountname + page.path;

    //When not on localhost, replace scheme to use https
    if (searchurl.search("localhost") == -1) {
      searchurl = searchurl.replace("http://", "https://");
    }

    console.log("Analyzing URL: " + searchurl);
    analyzeUrl(sitemorseUrl,searchurl, token)
      .then((result) => {
        console.log("Data received, processing results");
        processResults(result);
        displayPanel('info', true);
        closeDialog(dialogRef);
      }, () => {
        console.error('Unable to access Sitemorse service at:', sitemorseUrl);
        displayPanel('error', true);
        closeDialog(dialogRef);
      });
  }

  async function analyzeUrl (serviceurl, searchurl, token) {
    const response = await fetch(`${serviceurl}/?url=${searchurl}&token=${token}`);
    return await response.json(); //extract JSON from the http response
  }

  function processResults (response) {
    console.log(response);
    smartviewurl = response.result.url;
    reporturl = response.result["report-url"];
    
    refreshTable("seo", response.result.priorities.seo.diagnostics, 0);
    refreshTable("grc", response.result.priorities.grc.diagnostics, 1);
    refreshTable("ux", response.result.priorities.ux.diagnostics, 2);

    //Initialize the tooltips here, because they have been added programmatically in the previous step
    initTooltips();

    console.log("Processing done")
  }

  function refreshTable(id, data, index) {
    const tableelement = document.getElementById(id + "-table");
    clearTable(tableelement);
    if (data.length) {
      fillTable(tableelement, data);
      instances_collapsible[0].open(index);
      showWarning(id);
    } else {
      instances_collapsible[0].close(index);
      showCheck(id);
    }    
  }

  function showCheck(id) {
    document.getElementById(id + "-check").classList.remove('hide');
    document.getElementById(id + "-warning").classList.add('hide');
  }

  function showWarning(id) {
    document.getElementById(id + "-check").classList.add('hide');
    document.getElementById(id + "-warning").classList.remove('hide');
  }

  function clearTable(tableelement) {
    if (tableelement === null) {
      console.error("Can't clear table: null");
      return;
    }
    while (tableelement.firstChild) {
      tableelement.removeChild(tableelement.firstChild);
    }
  }

  function fillTable(tableelement, data) {
    //Add new elements
    let tblBody = document.createElement("tbody");

    for (var j = 0; j < data.length ; j++) {
      let row = document.createElement("tr");

      let cell = document.createElement("td");
      cell.classList.add("table-category");
      let cellText = document.createTextNode(data[j].category);
      cell.appendChild(cellText);
      row.appendChild(cell);

      cell = document.createElement("td");
      cellText = document.createTextNode(data[j].title);
      cell.appendChild(cellText);
      row.appendChild(cell);

      cell = document.createElement("td");
      cell.classList.add("table-count");
      cellText = document.createTextNode(data[j].total);
      cell.appendChild(cellText);
      row.appendChild(cell);

      cell = document.createElement("td");
      cell.classList.add("table-info");
      if (data[j].info) {
        cellIcon = document.createElement("i");
        cellIcon.classList.add("material-icons", "table-info-icon", "tooltipped");
        cellIcon.setAttribute("data-position", "left");
        cellIcon.setAttribute("data-tooltip", data[j].info);
        cellText = document.createTextNode("info");
        cellIcon.appendChild(cellText);
        cell.appendChild(cellIcon);
      }
      row.appendChild(cell);

      cell = document.createElement("td");
      cell.classList.add("table-video");
      if (data[j].video) {
        cellIcon = document.createElement("i");
        cellIcon.classList.add("material-icons", "table-video-icon", "tooltipped");
        cellIcon.setAttribute("data-position", "left");
        cellIcon.setAttribute("data-tooltip", "play help video for '" + data[j].title + "' (opens in new window)");
        cellText = document.createTextNode("play_circle_filled");
        cellIcon.appendChild(cellText);
        videoLink = document.createElement("a");
        videoLink.href = data[j].video;
        videoLink.target = "_blank";
        videoLink.appendChild(cellIcon);
        cell.appendChild(videoLink);
      }
      row.appendChild(cell);
    
      tblBody.appendChild(row);
    }

    // append the <tbody> inside the <table>
    tableelement.appendChild(tblBody);
  }
  
  function openDialog() {
    var elems = document.querySelectorAll('.modal');
    if (!elems.length) return null;
    let instance = M.Modal.getInstance(elems[0]);
    instance.open();
    return instance;
  }

  function closeDialog(instance) {
    if (instance === null) return;
    instance.close();
  }

  function initTooltips () {
    const elems_tooltip = document.querySelectorAll('.tooltipped');
    const options_tooltip = {
      enterDelay: 50,
    }    
    instances_tooltip = M.Tooltip.init(elems_tooltip, options_tooltip);
  }

  document.addEventListener('DOMContentLoaded', function() {
    const elems_collapsible = document.querySelectorAll('.collapsible');
    const options_collapsible = {
      accordion: false,
    }
    instances_collapsible = M.Collapsible.init(elems_collapsible, options_collapsible);

    const elems_modal = document.querySelectorAll('.modal');
    const options_modal = {
      dismissible: false,
    }
    instances_modal = M.Modal.init(elems_modal, options_modal);

    initExtension();

  });
})();