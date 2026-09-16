export const STATUS_STEPS = {
  1: 'Received at Ministry',
  2: 'Comments Sought from Organisation',
  3: 'Comments Received from organisation',
  4: 'Under Clarification',
  5: 'Comments Furnished to CAG',
  6: 'Accepted by CAG',
  7: 'Dropped'
};

export const CATEGORIES = ['Audit Para', 'Draft Para', 'CAG Report Item'];

export const getParaStatusText = (steps) => {
  let currentStatus = 'Draft';
  for (let i = 1; i <= 7; i++) {
    if (steps[i] === 'Yes') {
      currentStatus = STATUS_STEPS[i];
    }
  }
  return currentStatus;
};
