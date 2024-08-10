let currUser, timesheet, entity_data;
var timerInterval;

ZOHO.embeddedApp.on("PageLoad", function (data) {
  entity_data = data;
  ZOHO.CRM.META.getModules().then(function (mdata) {
    for (let i = 0; i < mdata.modules.length; i++) {
      const element = mdata.modules[i];
      if (element.api_name == entity_data.Entity) {
        entity_data.EntityName = element.singular_label;
      }
    }
    ZOHO.CRM.API.getRecord({
      Entity: entity_data.Entity,
      RecordID: entity_data.EntityId[0],
    }).then(async function (resp) {
      console.log(resp);
      let relDetail={};
      if( resp.hasOwnProperty("status") && resp.status==204){
          relDetail = await ZOHO.CRM.API.getRecord({
            Entity: "Tasks",
            RecordID: entity_data.EntityId[0]
          });
        
        if(entity_data.Entity=="Contacts" ){
          entity_data.EntityId[0]=relDetail.data[0].Who_Id.id
        }
        if(relDetail.data[0].$se_module == entity_data.Entity){
          entity_data.EntityId[0]=relDetail.data[0].What_Id.id
        }
      }
      var data=[];
      if( Array.isArray(resp.data)){
        data = resp.data[0];
      }else{
        let rData=await ZOHO.CRM.API.getRecord({
          Entity: entity_data.Entity,
          RecordID: entity_data.EntityId[0],
        });
        data= rData.data[0];
      }
      if (entity_data.Entity == "Deals") {
        entity_data["Name"] = data["Deal_Name"].trim();
      }
      if (entity_data.Entity == "Accounts") {
        entity_data["Name"] = data["Account_Name"].trim();
      }
      if (entity_data.Entity == "Contacts") {
        entity_data["Name"] = (
          (data["First_Name"] ?? "") +
          " " +
          (data["Last_Name"] ?? "")
        ).trim();
      }
        if (entity_data.Entity == "Leads") {
        entity_data["Name"] = (
          (data["First_Name"] ?? "") +
          " " +
          (data["Last_Name"] ?? "")
        ).trim();
      }
    });
  });

  console.log(data);

  ZOHO.CRM.CONFIG.getCurrentUser().then(function (data) {
    currUser = data.users[0];
    console.log(currUser);
    if (!storageAvailable("localStorage")) {
      alert("Please allow Cookies for this Browser");
    } else {
      isTimerRunning(currUser.id);
    }
  });
});

function storageAvailable(type) {
  var storage;
  try {
    storage = window[type];
    var x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
}

function showDuration(d1) {
  // $("#duration_col").removeClass("d-none")

  const dt1 = new Date(d1);
  const currD = new Date();
  clearInterval(timerInterval);

  var second = parseInt((currD.getTime() - dt1.getTime()) / 1000, 10);
  function pad(value) {
    return value > 9 ? value : "0" + value;
  }
  timerInterval = setInterval(function () {
    $("#dur_seconds").html(pad(parseInt((++second % 3600) % 60, 10)));
    $("#dur_minutes").html(pad(parseInt((second % 3600) / 60, 10)));
    $("#dur_hours").html(pad(parseInt(second / 3600, 10)));
  }, 1000);
}

function initiateTimer() {
  $("#change-manual-timer-col").toggleClass("d-none");
  var start_time, end_time;
  const dt = new Date();
  let list = dt.toString().split("GMT")[1].split("(")[0].split("");
  list.splice(3, 0, ":");
  tzone = Object.values(list).join("");
  console.log(tzone);
  start_time = (dt.toISOString().split(".")[0] + "+00:00").trim();
  var tim_name = entity_data.Name + " - " + dt.toISOString().split("T")[0];

  localStorage.removeItem(currUser.id);
  localStorage.removeItem("start_time");
  localStorage.removeItem("timesheet_id");

  localStorage.removeItem("related_module");
  localStorage.removeItem("related_module_name");
  localStorage.removeItem("related_module_id");

  localStorage.removeItem("timesheet_name");

  localStorage.setItem("timesheet_name", tim_name);
  var recordData = {
    Name: tim_name,
    Owner: currUser.id,
    timetracker__Start_Time: start_time,
  };

  if (entity_data.Entity == "Deals") {
    recordData.timetracker__Deal_Related_To = entity_data.EntityId[0];
  }
  if (entity_data.Entity == "Contacts") {
    recordData.timetracker__Contact_Related_To = entity_data.EntityId[0];
  }
  if (entity_data.Entity == "Accounts") {
    recordData.timetracker__Account_Related_To = entity_data.EntityId[0];
  }
  if (entity_data.Entity == "Leads") {
    recordData.timetracker__Lead_Related_To = entity_data.EntityId[0];
  }
  ZOHO.CRM.API.insertRecord({
    Entity: "timetracker__Timesheets",
    APIData: recordData,
  }).then(function (data) {
    console.log(data);
    timesheet = data.data[0].details;

    localStorage.setItem(currUser.id, true);
    localStorage.setItem("start_time", start_time);
    localStorage.setItem("timesheet_id", timesheet.id);

    localStorage.setItem("related_module_name", entity_data.EntityName);
    localStorage.setItem("related_module", entity_data.Entity);
    localStorage.setItem("related_module_id", entity_data.EntityId[0]);

    var related_module = localStorage.getItem("related_module");
    var related_module_name = localStorage.getItem("related_module_name");
    var related_module_id = localStorage.getItem("related_module_id");

    if (related_module == "Leads") {
    }
    console.log("related_to" + related_module_name);

    $("#related_to").html("<b>Related Module:</b> " + related_module_name);
    $("#timesheet_name").val(localStorage.getItem("timesheet_name"));

    showFinishData();
    showDuration(start_time);
  });
}

$(document).on("input", "#description", function (e) {
  localStorage.setItem("description", $(this).val());
});

$(document).on("input", "#hourly_rate", function (e) {
  localStorage.setItem("hourly_rate", $(this).val());
});

function finishTimer() {
  hideFinishData();
  var start_time, end_time;
  const dt = new Date();
  let list = dt.toString().split("GMT")[1].split("(")[0].split("");
  list.splice(3, 0, ":");
  tzone = Object.values(list).join("");

  end_time = (dt.toISOString().split(".")[0] + "+00:00").trim();
  var desc=$("#description").val()
  var recordData = {
    id: timesheet.id,
    Name: $("#timesheet_name").val(),
    timetracker__End_Time: end_time,
    timetracker__Hourly_Rate: $("#hourly_rate").val(),
    timetracker__Description: desc.substr(0,desc.length>1999?1999:desc.length),
    timetracker__Description_Full: desc.substr(0,desc.length>31999?31999:desc.length),
    timetracker__Finished: true,
  };
  ZOHO.CRM.API.updateRecord({
    Entity: "timetracker__Timesheets",
    APIData: recordData,
  }).then(function (data) {
    console.log(data);
    localStorage.setItem(currUser.id, false);
    notesMap = {
      Parent_Id: localStorage.getItem("related_module_id"),
      Note_Title: $("#timesheet_name").val(),
      Note_Content: $("#description").val(),
      $se_module: localStorage.getItem("related_module"),
    };
    ZOHO.CRM.API.insertRecord({ Entity: "Notes", APIData: notesMap }).then(
      function (data) {
        console.log(data);
        localStorage.removeItem("start_time");
        localStorage.removeItem("hourly_rate");
        localStorage.removeItem("timesheet_id");
        localStorage.removeItem("related_module");
        localStorage.removeItem("related_module_name");
        localStorage.removeItem("related_module_id");
        localStorage.removeItem("timesheet_name");
        localStorage.removeItem("description");
        ZOHO.CRM.UI.Popup.closeReload().then(function (data) {
          console.log(data);
        });
      }
    );

    hideFinishData();
  });
}

function cancelTimer() {

  ZOHO.CRM.API.deleteRecord({Entity:"timetracker__Timesheets",RecordID: timesheet.id})
  .then(function(data){
    localStorage.setItem(currUser.id, false);
    localStorage.removeItem("start_time");
    localStorage.removeItem("hourly_rate");
    localStorage.removeItem("timesheet_id");
    localStorage.removeItem("related_module");
    localStorage.removeItem("related_module_name");
    localStorage.removeItem("related_module_id");
    localStorage.removeItem("timesheet_name");
    localStorage.removeItem("description");
    ZOHO.CRM.UI.Popup.closeReload().then(function (data) {
      console.log(data);
    });
  })
}

function isTimerRunning(id) {
  //Related List
  const timerRunning = localStorage.getItem(id);

  if (timerRunning === "true") {
    showFinishData();
    var related_module_name = localStorage.getItem("related_module_name");
    var related_module_id = localStorage.getItem("related_module_id");

    $("#related_to").html("<b>Related Module:</b> " + related_module_name);
    showDuration(localStorage.getItem("start_time"));
    $("#related_to");
    $("#timesheet_name").val(localStorage.getItem("timesheet_name"));
    $("#description").val(localStorage.getItem("description"));
    $("#hourly_rate").val(localStorage.getItem("hourly_rate"));
    timesheet = {};
    timesheet.id = localStorage.getItem("timesheet_id") ?? "";
    $("#change-manual-timer-col").addClass("d-none");

    // return true;
    // getTimesheet();
  }
}

function getTimesheet() {
  ZOHO.CRM.API.searchRecord({
    Entity: "timetracker__Timesheets",
    Type: "criteria",
    Query:
      "((Owner.id:equals:" +
      currUser.id +
      ")and(timetracker__Finished:equals:false))",
  }).then(function (data) {
    console.log(data);
    var ret = true;
    if (data.status == 204) {
      ret = false;
    }
    if (data.hasOwnProperty("data")) {
      data.data.forEach((element) => {
        if (!!element["timetracker__Finished"]) {
          ret = false;
          return false;
        }
      });
    }

    if (ret == false) {
      setTimeout(getTimesheet(), 40000);
      return false;
    }
    showFinishData();
    timesheet = data.data[0];

    showDuration(data.data[0]["timetracker__Start_Time"]);
  });
}
function showFinishData() {
  $("#duration_col").removeClass("d-none");
  $(".finish_timer").removeClass("d-none");

  $("#start_timer_col").addClass("d-none");
}

function hideFinishData() {
  $("#duration_col").addClass("d-none");
  $(".finish_timer").addClass("d-none");

  $("#start_timer_col").removeClass("d-none");
}

//Code for manual,

function changeToManual() {
  $("#change-manual-timer-col").toggleClass("d-none");
  $("#start_timer_col").toggleClass("d-none");
  $("#manual-timer-col").toggleClass("d-none");
}

function insertManually() {
  $("#man-error-message").html("");
  if (!$("#man-starttime").val()) {
    $("#man-error-message").append("Start time is required<br/>");
  }else
  if (!$("#man-endtime").val()) {
    $("#man-error-message").append("End time is required<br/>");
  }else
  if ((Date.parse($("#man-endtime").val()) <= Date.parse($("#man-starttime").val()))) {
    $("#man-error-message").append("End time should be greater then start time <br/>");
    alert("End time should be greater then start time")
  }else{
  // if(!$("#man-starttime").val()){
  //     $("#man-error-message").append("Start time is required")
  // }
  // if(!$("#man-starttime").val()){
  //     $("#man-error-message").append("Start time is required")
  // }
  // if(!$("#man-starttime").val()){
  //     $("#man-error-message").append("Start time is required")
  // }
  var start_time, end_time;
  const stdt = new Date($("#man-starttime").val());
  let list = stdt.toString().split("GMT")[1].split("(")[0].split("");
  list.splice(3, 0, ":");
  tzone = Object.values(list).join("");
  console.log(tzone);
  start_time = (stdt.toISOString().split(".")[0] + "+00:00").trim();

  const etdt = new Date($("#man-endtime").val());
  let liste = etdt.toString().split("GMT")[1].split("(")[0].split("");
  liste.splice(3, 0, ":");
  tzone = Object.values(liste).join("");
  console.log(tzone);
  end_time = (etdt.toISOString().split(".")[0] + "+00:00").trim();

  var tim_name =
    $("#man-timesheet-name").val() ??
    entity_data.Name + " - " + stdt.toISOString().split("T")[0];

  // localStorage.setItem("timesheet_name",tim_name);
  var recordData = {
    Name: tim_name,
    Owner: currUser.id,
    timetracker__Start_Time: start_time,
    timetracker__End_Time: end_time,
    timetracker__Hourly_Rate: $("#man-hourly_rate").val(),
    timetracker__Description: $("#man-description").val(),
    timetracker__Finished: true,
  };

  if (entity_data.Entity == "Deals") {
    recordData.timetracker__Deal_Related_To = entity_data.EntityId[0];
  }
  if (entity_data.Entity == "Contacts") {
    recordData.timetracker__Contact_Related_To = entity_data.EntityId[0];
  }
  if (entity_data.Entity == "Accounts") {
    recordData.timetracker__Account_Related_To = entity_data.EntityId[0];
  }
  if (entity_data.Entity == "Leads") {
    recordData.timetracker__Lead_Related_To = entity_data.EntityId[0];
  }
  ZOHO.CRM.API.insertRecord({
    Entity: "timetracker__Timesheets",
    APIData: recordData,
  }).then(function (data) {
    console.log(data);
    timesheet = data.data[0].details;
    ZOHO.CRM.UI.Popup.closeReload().then(function (data) {
      console.log(data);
    });
  });
}
}

//Borrowed Code from: https://stackoverflow.com/questions/34374180/javascript-countdown-between-2-dates
function renderCountup(dateStart, dateEnd) {
  let targetDate = dateEnd.getTime();
  let days, hours, minutes, seconds;
  let countdown = document.getElementById("duration");
  let count = 0;
  let getCountdown = function (c) {
    let currentDate = new Date().getTime();
    let secondsLeft = (targetDate - currentDate) / 1000 + c;
    days = pad(Math.floor(secondsLeft / 86400));
    secondsLeft %= 86400;
    hours = pad(Math.floor(secondsLeft / 3600));
    secondsLeft %= 3600;
    minutes = pad(Math.floor(secondsLeft / 60));
    seconds = pad(Math.floor(secondsLeft % 60));
    countdown.innerHTML =
      "<span>" +
      hours +
      ":</span><span>" +
      minutes +
      ":</span><span>" +
      seconds +
      ":</span>";
  };

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  getCountdown(count++);
  setInterval(function () {
    getCountdown(count++);
  }, 1000);
}

ZOHO.embeddedApp.init();
