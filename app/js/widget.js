'use-strict';

// ! ------------------------------------------- Global Variables ----------------------------------
const MODULE_NAME_MAP = {
  Deals: 'Cases',
  Accounts: 'Matters',
  Tasks: 'Tasks',
};
let Entity,
  EntityId,
  job,
  litigationCodes = [],
  activityCodes = [],
  allVendors = [],
  allTrades = [],
  signedQuoteItems = [],
  workOrderItems = [],
  materialOrderItems = [];
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

// ! ------------------------------------------- End UI Functions -----------------------------------------------
// * ============================================================================================================
// ! ------------------------------------------- CRM Interaction Functions --------------------------------------

async function fetchTradeRecords() {
  try {
    let response = await ZOHO.CRM.API.getAllRecords({
      Entity: 'Trades',
      page: 1,
      per_page: 200, // Adjust per_page as needed
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Trade records:', error);
    return [];
  }
}

// ! ------------------------------------------- End CRM Interaction Functions --------------------------------------
// * ================================================================================================================
// ! ------------------------------------------- Window Load --------------------------------------------------------

window.addEventListener('DOMContentLoaded', function () {
  ZOHO.embeddedApp.on('PageLoad', async function (data) {
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

    let entityRecord = await ZOHO.CRM.API.getRecord({
      Entity,
      RecordID: data.EntityId[0],
    });

    let currentUser = await ZOHO.CRM.CONFIG.getCurrentUser();
    let userInfo = await ZOHO.CRM.API.getUser({ ID: currentUser.users[0].id });
    let response = await ZOHO.CRM.API.getAllRecords({
      Entity: 'Litigation_Codes',
    });

    response.data.forEach((code) => {
      if (code.Name.startsWith('A')) {
        activityCodes.push({
          id: code.id,
          name: code.Name,
        });
      } else {
        litigationCodes.push({
          id: code.id,
          name: code.Name,
        });
      }
    });

    $('#name').value = entityRecord.data?.[0]?.Deal_Name;
    $('#employee').value = currentUser.users[0].full_name;
    $('#hourlyRate').value = userInfo.users[0].Rate;
    console.log(
      '================================ Entity ================================'
    );

    console.log(litigationCodes);
    console.log(activityCodes);

  });
  ZOHO.embeddedApp.init();
});

// ! ------------------------------------------- End Window Load ------------------------------------------------
// * ============================================================================================================
// ! ------------------------------------------- Utility Functions ----------------------------------------------

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
