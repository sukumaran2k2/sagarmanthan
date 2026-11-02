export const STAGE_FIELDS = [ // in stage order: stage_id = position + 1
  { column: 'received_ministry', date: 'receivedMinistryDate', remarks: 'receivedMinistryRemarks', label: 'Received at Ministry' },
  { column: 'sent_for_comments', date: 'sentForCommentDate', remarks: 'sentForCommentsRemarks', label: 'Sent for Comments' },
  { column: 'comments_rec', date: 'commentsReceivedDate', remarks: 'commentsRecRemarks', label: 'Comments Received' },
  { column: 'file_submitted', date: 'fileSubmittedDate', remarks: 'fileSubmittedRemarks', label: 'File submitted for Approval' },
  { column: 'reply_furnished', date: 'replyFurnishedDate', remarks: 'replyFurnishedRemarks', label: 'Reply furnished to other ministry' },
];

// column: <column>_date/_remarks in the table; date/remarks: request body keys from the Input Form.
// label matches mmt_wings.wing_name (trimmed); sent_for_comments_wings holds the wing ids.
export const WING_FIELDS = [
  { column: 'shipping', date: 'shippingDate', remarks: 'shippingRemarks', label: 'Shipping' },
  { column: 'vigilance', date: 'vigilanceDate', remarks: 'vigilanceRemarks', label: 'Vigilance' },
  { column: 'ports', date: 'portsDate', remarks: 'portsRemarks', label: 'Ports' },
  { column: 'iwt', date: 'iwtDate', remarks: 'iwtRemarks', label: 'IWT' },
  { column: 'administration', date: 'administrationDate', remarks: 'administrationRemarks', label: 'Administration' },
  { column: 'coord_I', date: 'coordIDate', remarks: 'coordIRemarks', label: 'Coord-I' },
  { column: 'coord_II', date: 'coordIIDate', remarks: 'coordIIRemarks', label: 'Coord-II' },
  { column: 'dgll_parliament_and_trw', date: 'dgllDate', remarks: 'dgllRemarks', label: 'DGLL, Parliament & TRW' },
  { column: 'development', date: 'developmentDate', remarks: 'developmentRemarks', label: 'Development' },
  { column: 'finance', date: 'financeDate', remarks: 'financeRemarks', label: 'Finance' },
  { column: 'sagarmala', date: 'sagarmalaDate', remarks: 'sagarmalaRemarks', label: 'Sagarmala' },
  { column: 'information_technology', date: 'informationTechnologyDate', remarks: 'informationTechnologyRemarks', label: 'Information Technology' },
  { column: 'office_of_economic_advisor', date: 'economicAdvisorDate', remarks: 'economicAdvisorRemarks', label: 'Office of Economic Advisor' },
  { column: 'special_initiatives_and_projects', date: 'specialInitiativesDate', remarks: 'specialInitiativesRemarks', label: 'Special Initiatives & Projects' },
  { column: 'alhw_and_media', date: 'alhwMediaDate', remarks: 'alhwMediaRemarks', label: 'ALHW & Media' },
];

// Column sizes in tbl_cabinet_notes_ministry
export const MAX_LENGTH = {
  subject: 256,
  eofficeFileNumber: 256,
  sentForCommentsWings: 256,
  stageRemarks: 250,
};
