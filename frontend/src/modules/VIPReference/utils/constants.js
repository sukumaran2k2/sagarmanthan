export const STAGE_STEPS = {
  1: 'Received at Ministry',
  2: 'Submitted for Approval',
  3: 'Comments Sought',
  4: 'Comments Received',
  5: 'Reply Furnished',
  6: 'Disposed'
};

export const STAGE_MAPPING = {
  "No Status": 0,
  "Received but yet to be sent for Comments": 1,
  "Submitted for Approval": 2,
  "Comments Sought": 3,
  "Comments Received": 4,
  "Reply Furnished": 5,
  "Disposed": 6,
  "Dropped": 6
};

export const PENDENCY_AGE_MAPPING = {
  "0-30 Days": 30,
  "31-60 Days": 60,
  "More Than 60 Days": 61
};
