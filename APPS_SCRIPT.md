# Google Apps Script Backend Code

Below is the complete `Code.gs` script for your Google Apps Script Web App. It handles both:
1. `GET ?action=getDashboardData` (Reading data for dashboard initialization)
2. `POST` direct micro-updates (`clearAgenda`, `markMetToday`, `addIdea`, `updateKlalStatus`)

### Deployment Instructions:
1. Open your Google Sheet (*Student Guidance Tracker*).
2. Go to **Extensions** → **Apps Script**.
3. Replace or merge the contents of `Code.gs` with the snippet below.
4. Click **Deploy** → **Manage Deployments** → **Edit** (Pencil icon) → select **New version** → click **Deploy**.
5. Make sure **Who has access** is set to **Anyone**.

---

```javascript
/**
 * Shana Bet Guidance Tracker - Google Apps Script Web App
 * Supports Desktop Command Center reads and direct desktop micro-updates.
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // 1. Parse parameters from both GET query string and POST body
  var params = (e && e.parameter) ? e.parameter : {};

  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      for (var key in body) {
        params[key] = body[key];
      }
    } catch (parseErr) {
      // In case body is form-encoded or plain text
    }
  }

  var action = params.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // -------------------------------------------------------------
    // ACTION: getDashboardData
    // -------------------------------------------------------------
    if (action === "getDashboardData") {
      var studentsSheet = ss.getSheetByName("Students");
      var logsSheet = ss.getSheetByName("Logs");
      var klalSheet = ss.getSheetByName("Klal");

      var students = studentsSheet ? studentsSheet.getDataRange().getValues() : [];
      var logs = logsSheet ? logsSheet.getDataRange().getValues() : [];
      var klal = klalSheet ? klalSheet.getDataRange().getValues() : [];

      return createJsonResponse({
        status: "success",
        action: "getDashboardData",
        data: {
          students: students,
          logs: logs,
          klal: klal
        },
        message: "Dashboard data fetched successfully"
      });
    }

    // -------------------------------------------------------------
    // ACTION: clearAgenda
    // Clears Column E (NextAgenda) for the specified student
    // -------------------------------------------------------------
    if (action === "clearAgenda") {
      var studentName = params.studentName;
      if (!studentName) throw new Error("studentName is required");

      var studentsSheet = ss.getSheetByName("Students");
      if (!studentsSheet) throw new Error("Students sheet tab not found");

      var data = studentsSheet.getDataRange().getValues();
      var rowIndex = -1;

      // Col B: Name (index 1), Col E: NextAgenda (column 5)
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim().toLowerCase() === String(studentName).trim().toLowerCase()) {
          rowIndex = i + 1; // 1-based row number
          break;
        }
      }

      if (rowIndex === -1) throw new Error("Student not found: " + studentName);

      // Col E is column 5 in 1-based indexing
      studentsSheet.getRange(rowIndex, 5).setValue("");

      return createJsonResponse({
        status: "success",
        action: "clearAgenda",
        studentName: studentName,
        message: "Cleared agenda for " + studentName
      });
    }

    // -------------------------------------------------------------
    // ACTION: markMetToday
    // Updates Column F (LastMetDate) to today's ISO date string
    // -------------------------------------------------------------
    if (action === "markMetToday") {
      var studentName = params.studentName;
      if (!studentName) throw new Error("studentName is required");

      var studentsSheet = ss.getSheetByName("Students");
      if (!studentsSheet) throw new Error("Students sheet tab not found");

      var data = studentsSheet.getDataRange().getValues();
      var rowIndex = -1;

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim().toLowerCase() === String(studentName).trim().toLowerCase()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) throw new Error("Student not found: " + studentName);

      // Col F is column 6 (LastMetDate)
      var nowIso = new Date().toISOString();
      studentsSheet.getRange(rowIndex, 6).setValue(nowIso);

      return createJsonResponse({
        status: "success",
        action: "markMetToday",
        studentName: studentName,
        lastMetDate: nowIso,
        message: "Marked " + studentName + " as met today"
      });
    }

    // -------------------------------------------------------------
    // ACTION: addIdea
    // Appends a new bullet item to Column E (NextAgenda)
    // -------------------------------------------------------------
    if (action === "addIdea") {
      var studentName = params.studentName;
      var idea = params.idea;
      if (!studentName) throw new Error("studentName is required");
      if (!idea) throw new Error("idea text is required");

      var studentsSheet = ss.getSheetByName("Students");
      if (!studentsSheet) throw new Error("Students sheet tab not found");

      var data = studentsSheet.getDataRange().getValues();
      var rowIndex = -1;

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim().toLowerCase() === String(studentName).trim().toLowerCase()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) throw new Error("Student not found: " + studentName);

      var currentAgenda = String(data[rowIndex - 1][4] || "").trim();
      var bullet = (idea.indexOf("•") === 0 || idea.indexOf("-") === 0) ? idea : "• " + idea;
      var newAgenda = currentAgenda.length > 0 ? (currentAgenda + "\n" + bullet) : bullet;

      // Col E is column 5
      studentsSheet.getRange(rowIndex, 5).setValue(newAgenda);

      return createJsonResponse({
        status: "success",
        action: "addIdea",
        studentName: studentName,
        newAgenda: newAgenda,
        message: "Added idea to agenda for " + studentName
      });
    }

    // -------------------------------------------------------------
    // ACTION: updateKlalStatus
    // Locates initiative by Col C (Title) and updates Col F (Status)
    // -------------------------------------------------------------
    if (action === "updateKlalStatus") {
      var title = params.title;
      var status = params.status;
      if (!title) throw new Error("title is required");
      if (!status) throw new Error("status is required");

      var klalSheet = ss.getSheetByName("Klal");
      if (!klalSheet) throw new Error("Klal sheet tab not found");

      var data = klalSheet.getDataRange().getValues();
      var rowIndex = -1;

      // Col C: Initiative Title (index 2)
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][2]).trim().toLowerCase() === String(title).trim().toLowerCase()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex === -1) throw new Error("Initiative not found: " + title);

      // Col F is column 6 (Status)
      klalSheet.getRange(rowIndex, 6).setValue(status);

      return createJsonResponse({
        status: "success",
        action: "updateKlalStatus",
        title: title,
        status: status,
        message: "Updated status of '" + title + "' to " + status
      });
    }

    return createJsonResponse({
      status: "error",
      message: "Unknown action: " + action
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Returns JSON output with appropriate MIME type
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

