'use-strict';

// ! ------------------------------------------- Global Variables ----------------------------------
const MODULE_NAME_MAP = {
  Deals: 'Cases',
  Accounts: 'Matters',
  Tasks: 'Tasks',
};
let Entity,
  EntityId,
  timerState = {
    status: 'stopped',
    time: 0,
    intervalRef: null,
  },
  timeSheetData = {
    relatedModule: '',
    name: '',
    userId: '',
    hourlyRate: '',
    litigationCode: '',
    activityCode: '',
  },
  allUsers = [],
  allUsersInfo = {},
  litigationCodes = [],
  activityCodes = [];
// ! ------------------------------------------- End Global Variables -------------------------------------------
// * ============================================================================================================
// ! ------------------------------------------- UI Functions ---------------------------------------------------

/**
 * @param {number | string} id
 * @param {{label:'',value:''} []} options
 * @param {string} label
 * @returns {HTMLSelectElement}
 */
function createSelectElement(id, options = [], label = 'Select Trade') {
  return `<select id="${id}" class='px-3 py-2'>
            <option value="">${label}</option>
            ${options.map(
              (option) =>
                `<option ${option.selected ? 'selected' : ''} value="${
                  option.value
                }">${option.label}</option>`
            )}
          </select>`;
}

function updateTimerUI() {
  const formattedTime = formatTime(timerState.time);
  $('#timer').textContent = formattedTime;
}

function handleManualEntry() {
  const startTime = $('#startTime');
  const endTime = $('#endTime');

  startTime.parentElement.classList.remove('hidden');
  endTime.parentElement.classList.remove('hidden');
  $('#backToTimer').classList.remove('hidden');
  $('#saveTimesheet').classList.remove('hidden');
  $('#startTimer').classList.add('hidden');
  $('#manualEntry').classList.add('hidden');
}

function handleBackToTimer() {
  const startTime = $('#startTime');
  const endTime = $('#endTime');

  startTime.parentElement.classList.add('hidden');
  endTime.parentElement.classList.add('hidden');
  $('#backToTimer').classList.add('hidden');
  $('#saveTimesheet').classList.add('hidden');
  $('#startTimer').classList.remove('hidden');
  $('#manualEntry').classList.remove('hidden');
}

function startTimer() {
  if (timerState.status !== 'stopped') return;
  timerState.status = 'running';
  const ref = setInterval(() => {
    timerState.time += 1;
    updateTimerUI();
  }, 1000);
  timerState.intervalRef = ref;
  $('#manualEntry').classList.remove('hidden');
  $('#startTimer').classList.add('hidden');
  $('#manualEntry').classList.add('hidden');
  $('#timer').classList.remove('hidden');
  $('#stopTimer').classList.remove('hidden');
  $('#endSession').classList.add('hidden');
}

function stopTimer() {
  if (timerState.status !== 'running') return;
  timerState.status = 'stopped';
  clearInterval(timerState.intervalRef);
  timerState.intervalRef = null;
  $('#endSession').classList.remove('hidden');
  $('#startTimer').classList.remove('hidden');
  $('#stopTimer').classList.add('hidden');
}

function handleSessionEnd() {
  if (timerState.status === 'stopped' && timerState.time > 60) {
    const data = {
      ...timeSheetData,
      litigationCode: $('#litigationCode').value,
      activityCode: $('#activityCode').value,
      description: $('#description').value,
    };
    // createTimeSheetRecord(data);
  }
}

async function handleEmployeeSelect(event) {
  var employeeSelector = $('#employee');
  const id = event.target.value;
  let userInfo;

  if (allUsersInfo[id]) {
    userInfo = allUsersInfo[id];
  } else {
    event.target.disabled = true;
    const data = await getUserInfo(id);
    userInfo = data.users[0];
    allUsersInfo[userInfo.id] = userInfo;
  }
  const topSelect = [...employeeSelector.options].find(
    (option) => option.value === id
  );
  event.target.disabled = false;
  topSelect.selected = true;
  $('#hourlyRate').value = userInfo.Rate;
}

// ! ------------------------------------------- End UI Functions -----------------------------------------------
// * ============================================================================================================
// ! ------------------------------------------- CRM Interaction Functions --------------------------------------

async function createTimeSheetRecord(data) {
  try {
    let response = await ZOHO.CRM.API.insertRecord({
      Entity: 'timetracker__Timesheets',
      APIData: {
        Name: data,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Trade records:', error);
    return [];
  }
}

async function getUserInfo(id) {
  let userInfo = await ZOHO.CRM.API.getUser({
    ID: id,
  });
  return userInfo;
}

// ! ------------------------------------------- End CRM Interaction Functions --------------------------------------
// * ================================================================================================================
// ! ------------------------------------------- Window Load --------------------------------------------------------

window.addEventListener('DOMContentLoaded', function () {
  ZOHO.embeddedApp.on('PageLoad', async function (data) {
    try {
      await ZOHO.CRM.UI.Resize({
        height: '600',
        width: '800',
      });
      Entity = data.Entity;
      EntityId =
        typeof data.EntityId === 'string' ? data.EntityId : data.EntityId[0];
      const { org } = await ZOHO.CRM.CONFIG.getOrgInfo();
      window.company_name = org[0].company_name;

      $('#moduleName').textContent = MODULE_NAME_MAP[Entity];
      timeSheetData.relatedModule = Entity;

      let entityRecord = await ZOHO.CRM.API.getRecord({
        Entity,
        RecordID: data.EntityId[0],
      });

      let currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();

      let response = await ZOHO.CRM.API.getAllUsers({ Type: 'ActiveUsers' });
      allUsers = response.users;

      let userInfo = await ZOHO.CRM.API.getUser({
        ID: currentUser.users[0].id,
      });
      // console.log(userInfo);
      allUsersInfo[userInfo.users[0].id] = userInfo.users[0];

      let litigationRecords = await ZOHO.CRM.API.getAllRecords({
        Entity: 'Litigation_Codes',
      });
      let activityRecords = await ZOHO.CRM.API.getAllRecords({
        Entity: 'Activity_Codes',
      });

      litigationRecords.data.forEach((code) => {
        litigationCodes.push({
          id: code.id,
          name: code.Name,
        });
      });

      activityRecords.data.forEach((code) => {
        activityCodes.push({
          id: code.id,
          name: code.Name,
        });
      });

      $('#name').value = entityRecord.data?.[0]?.Deal_Name;
      $('#employee').value = currentUser.users[0].full_name;
      $('#hourlyRate').value = userInfo.users[0].Rate;
      timeSheetData.name = entityRecord.data?.[0]?.Deal_Name;
      timeSheetData.userId = currentUser.users[0].id;
      timeSheetData.hourlyRate = userInfo.users[0].Rate;

      var litigationCodeSelector = $('#litigationCode');
      var activityCodeSelector = $('#activityCode');
      var employeeSelector = $('#employee');

      litigationCodes.forEach((code) => {
        const option = document.createElement('option');
        option.value = code.id;
        option.textContent = code.name;
        litigationCodeSelector.appendChild(option);
      });

      activityCodes.forEach((code) => {
        const option = document.createElement('option');
        option.value = code.id;
        option.textContent = code.name;
        activityCodeSelector.appendChild(option);
      });

      allUsers.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.full_name;
        option.selected = user.id === currentUser.id;
        employeeSelector.appendChild(option);
      });

      employeeSelector.onchange = handleEmployeeSelect;

      $('#startTimer').onclick = startTimer;
      $('#stopTimer').onclick = stopTimer;
      $('#endSession').onclick = handleSessionEnd;
      $('#manualEntry').onclick = handleManualEntry;
      $('#backToTimer').onclick = handleBackToTimer;
      // $('#manualEntry').onclick = () => {
      //   if ($('#manualEntry').textContent === 'Manual Entry') {
      //     $('#manualEntry').textContent = 'Timer Mode';
      //     $('#startTime').classList.remove('hidden');
      //     $('#endTime').classList.remove('hidden');
      //   }else{
      //     $('#manualEntry').textContent = 'Manual Entry';
      //     $('#startTime').classList.add('hidden');
      //     $('#endTime').classList.add('hidden');
      //   }
      // };

      $('#loadingSkeleton').classList.remove('grid');
      $('#loadingSkeleton').classList.add('hidden');

      $('#relatedModuleTag').classList.remove('hidden');
      $('#timesheetForm').classList.remove('hidden');
      $('#timesheetForm').classList.add('grid');
    } catch (error) {
      console.error(error);
      alert('Something went wrong');
    }
  });

  ZOHO.embeddedApp.init();
});

// ! ------------------------------------------- End Window Load ------------------------------------------------
// * ============================================================================================================
// ! ------------------------------------------- Utility Functions ----------------------------------------------

/**
 *
 * @param {number} time Number of seconds
 */
function formatTime(time) {
  let hour = Math.floor(time / 3600),
    minutes = Math.floor((time % 3600) / 60),
    seconds = time % 60;
  return `${hour > 9 ? hour : `0${hour}`}:${
    minutes > 9 ? minutes : `0${minutes}`
  }:${seconds > 9 ? seconds : `0${seconds}`}`;
}

/**
 * @param {string} query
 * @returns {HTMLElement | NodeList} */
function $(query) {
  const results = document.querySelectorAll(query);
  return results.length === 1 ? results[0] : results;
}

/**
 * @param {object} params
 * @returns {string}
 */
function formatParams(params) {
  const url = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.set(key, value);
  });

  return url.toString();
}

/**
 *
 * @param {string | Number} amountStr
 * @returns string
 */
function formatMoney(amountStr) {
  return parseFloat(amountStr)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ! ------------------------------------------- End Utility Functions -------------------------------------------
