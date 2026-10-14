import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

export const axiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/hr`,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const createContractualData = (data) => {
    return axiosInstance.post(
        '/contractual-employment',
        data
    );
};

export const getContractualData = () => {
    return axiosInstance.get(
        '/contractual-employment'
    );
};

export const deleteContractualData = (contractId, organisationID) => {
    return axiosInstance.delete(
        `/delete-contractual-data/${contractId}/${organisationID}`
    );
};

export const createTrainingData = (data) => {
    return axiosInstance.post(
        '/create-hr-training-data',
        data
    );
};

export const getHRStaffTransactData = (organisationID, trainingID = 0) => {
    return axiosInstance.get(
        `/get-hr-staff-transact-data/${organisationID}/${trainingID}`
    );
};

export const getTrainingTitleData = (organisationID, trainingType) => {
  return axiosInstance.get(
        `/get-hr-training-title-by-org/${organisationID}/${trainingType}`
    );
};

export const getTrainingTypeData = () => {
    return axiosInstance.get(
        '/get-hr-training-type'
    );
};

export const getHRTrainingDataByID = (trainingID) => {
    return axiosInstance.get(
        `/get-hr-training-data-by-id/${trainingID}`
    );
};

export const updateTrainingData = (trainingID, data) => {
  return axiosInstance.put(
    `/update-hr-training-data/${trainingID}`,
    data
  );
};

export const getDropDownData = (mmt_country) => {
    return axios.get(
        `${API_BASE_URL}/mmt-dropdown/${encodeURIComponent(mmt_country)}`
    );
};
