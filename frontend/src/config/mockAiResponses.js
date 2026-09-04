/**
 * Mock AI Responses & Test Fixtures
 * File: frontend/src/config/mockAiResponses.js
 * 
 * Used for testing SagarBot AI report generation and dynamic table UI
 * before connecting to the live OpenAI LLM endpoint.
 */

export const MOCK_AI_RESPONSES = [
  {
    triggers: [
      'show all ongoing projects for chennai port',
      'ongoing projects for chennai port',
      'chennai port ongoing projects',
      'chennai port projects',
      'chennai port'
    ],
    response: {
      status: "success",
      user_question: "Show all ongoing projects for Chennai port",
      module_name: "Projects",
      table_name: "tbl_chatbot_projects",
      sql_query: "SELECT organisation_name AS ORGANIZATION_NAME, project_name AS PROJECT_NAME, stage_name AS STAGE_NAME, estimated_cost AS ESTIMATED_COST_IN_CRORES, sanctioned_cost AS SANCTIONED_COST_IN_CRORES FROM tbl_chatbot_projects WHERE organisation_name LIKE '%Chennai Port Authority%' AND stage_name != 'Completed';",
      row_count: 14,
      summary: "Chennai Port Authority is currently implementing 14 projects, including the augmentation of the firefighting system in the Oil Dock and the modernization of the Chennai Fishing Harbour, with estimated costs of ₹43.27 crores and ₹97.95 crores respectively.",
      execution_time_ms: 4969.05,
      data: [
        {
          ORGANIZATION_NAME: "Chennai Port Authority",
          PROJECT_NAME: "Augmentation of existing firefighting system in Oil Dock of ChPA as per OISD standard 156-2017",
          STAGE_NAME: "Under Implementation",
          ESTIMATED_COST_IN_CRORES: "43.27",
          SANCTIONED_COST_IN_CRORES: "35.41"
        },
        {
          ORGANIZATION_NAME: "Chennai Port Authority",
          PROJECT_NAME: "Modernization of Chennai Fishing Harbour with world-class hygienic fish handling facilities",
          STAGE_NAME: "Under Implementation",
          ESTIMATED_COST_IN_CRORES: "97.95",
          SANCTIONED_COST_IN_CRORES: "97.95"
        },
        {
          ORGANIZATION_NAME: "Chennai Port Authority",
          PROJECT_NAME: "Development of Coastal Berth and Barge Handling Facility at ChPA",
          STAGE_NAME: "Work Awarded",
          ESTIMATED_COST_IN_CRORES: "64.10",
          SANCTIONED_COST_IN_CRORES: "58.20"
        },
        {
          ORGANIZATION_NAME: "Chennai Port Authority",
          PROJECT_NAME: "Construction of Bunker Berth at Bharathi Dock",
          STAGE_NAME: "In Progress",
          ESTIMATED_COST_IN_CRORES: "52.40",
          SANCTIONED_COST_IN_CRORES: "44.10"
        },
        {
          ORGANIZATION_NAME: "Chennai Port Authority",
          PROJECT_NAME: "Installation of 5MW Roof-Top Solar PV Power Plant",
          STAGE_NAME: "Under Implementation",
          ESTIMATED_COST_IN_CRORES: "26.50",
          SANCTIONED_COST_IN_CRORES: "22.30"
        }
      ]
    }
  },
  {
    triggers: [
      'list out all the consultant appointment with their important details',
      'consultant appointment',
      'consultant appointments',
      'consultants list',
      'consultant'
    ],
    response: {
      status: "success",
      user_question: "List out all the consultant appointment with their important details",
      module_name: "Consultant Appointments",
      table_name: "tbl_chatbot_consultants",
      sql_query: "SELECT organisation_name AS PORT_NAME, consultant_name AS CONSULTANT_NAME, scope_of_work AS SCOPE_OF_WORK, contract_value_cr AS CONTRACT_VALUE_CR, stage_name AS STATUS FROM tbl_chatbot_consultants ORDER BY contract_value_cr DESC;",
      row_count: 8,
      summary: "Found 8 active consultant appointments across major ports, including Tata Consulting Engineers and AECOM for Master Planning and Deep Water Port Expansion.",
      execution_time_ms: 3120.40,
      data: [
        {
          PORT_NAME: "Jawaharlal Nehru Port Authority",
          CONSULTANT_NAME: "Tata Consulting Engineers Ltd",
          SCOPE_OF_WORK: "Detailed Project Report for Vadhvan Mega Port Expansion",
          CONTRACT_VALUE_CR: "18.50",
          STATUS: "Active"
        },
        {
          PORT_NAME: "Deendayal Port Authority",
          CONSULTANT_NAME: "AECOM India Pvt Ltd",
          SCOPE_OF_WORK: "Techno-Economic Feasibility for Green Hydrogen Hub",
          CONTRACT_VALUE_CR: "12.80",
          STATUS: "Active"
        },
        {
          PORT_NAME: "Chennai Port Authority",
          CONSULTANT_NAME: "L&T Infrastructure Engineering",
          SCOPE_OF_WORK: "Coastal Berth Structural Integrity Assessment",
          CONTRACT_VALUE_CR: "4.20",
          STATUS: "In Progress"
        }
      ]
    }
  }
];

export default MOCK_AI_RESPONSES;
