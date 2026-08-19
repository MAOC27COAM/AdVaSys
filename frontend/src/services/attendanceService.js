import api from './api';

export const attendanceService = {
  getAllSessions: async (cycleId) => {
    const response = await api.get('/attendance/sessions', {
      params: { cycleId },
    });
    return response.data;
  },

  getSessionDetails: async (sessionId, cycleId) => {
    const response = await api.get(`/attendance/session/${sessionId}/details`, {
      params: { cycleId },
    });
    return response.data;
  },

  getStudentListForAttendance: async (cycleId, filters = {}) => {
    const response = await api.get('/attendance/student-list', {
      params: { cycleId, ...filters },
    });
    return response.data;
  },

  getMyAttendanceHistory: async () => {
    const response = await api.get('/attendance/my-history');
    return response.data;
  },

  getStudentAttendanceHistory: async (studentId, cycleId) => {
    const response = await api.get(`/attendance/student/${studentId}/history`, {
      params: { cycleId },
    });
    return response.data;
  },

  startSession: async (name, cycleId) => {
    const response = await api.post('/attendance/session/start', { name, cycleId });
    return response.data;
  },

  recordAttendance: async (identifierType, identifierValue, status, sessionId) => {
    const response = await api.post('/attendance/record', {
      identifierType,
      identifierValue,
      status,
      sessionId,
    });
    return response.data;
  },

endSession: async (sessionId, missingStudentIds, cycleId) => {
    const response = await api.patch(`/attendance/session/end/${sessionId}`, {
      missingStudentIds,
      cycleId,
    });
    return response.data;
  },

  reopenSession: async (sessionId, cycleId) => {
    const response = await api.patch(`/attendance/session/reopen/${sessionId}`, undefined, {
      params: { cycleId },
    });
    return response.data;
  },

  deleteSession: async (sessionId, cycleId) => {
    const response = await api.delete(`/attendance/session/${sessionId}`, {
      params: { cycleId },
    });
    return response.data;
  },

  exportStudentAttendanceHistory: async (studentId, cycleId) => {
    const response = await api.get(`/attendance/student/${studentId}/export`, {
      params: { cycleId },
      responseType: 'blob',
    });
    return response.data;
  },

  getPuzzleData: async (cycleId, filters = {}) => {
    const response = await api.get('/attendance/puzzle', {
      params: { cycleId, ...filters },
    });
    return response.data;
  },

  exportPuzzleToExcel: async (cycleId, filters = {}) => {
    const response = await api.get('/attendance/puzzle/export', {
      params: { cycleId, ...filters },
      responseType: 'blob',
    });
    return response.data;
  },
};
