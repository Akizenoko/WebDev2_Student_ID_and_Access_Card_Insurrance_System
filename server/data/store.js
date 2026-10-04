let idCounter = 100;
const nextId = () => ++idCounter;

export const db = {
  users: [
    {
      id: 1,
      email: 'student@wmsu.edu.ph',
      password: 'password123',
      role: 'student',
      isActive: true,
    },
    {
      id: 2,
      email: 'admin@wmsu.edu.ph',
      password: 'admin123',
      role: 'admin',
      isActive: true,
    },
  ],

  studentProfiles: [
    {
      id: 1,
      user_id: 1,
      student_number: '2025-01190',
      first_name: 'The',
      last_name: 'Knave',
      program: 'BS Computer Science',
      year_level: '3rd Year',
    },
  ],

  adminProfiles: [
    {
      id: 1,
      user_id: 2,
      employee_no: 'EMP-2023-042',
      office: 'Office of the University Registrar',
    }
  ],

  uploadedFiles: [
    {
      id: 1,
      uploaded_by: 1,
      kind: 'id_photo',
      storage_path: '/assets/Arle.png',
      media_type: 'image/png',
    },
  ],

  applications: [
    {
      id: 1,
      application_no: 'APP-2025-0010',
      student_id: 1,
      assigned_to: 1,
      photo_file_id: 1,
      type: 'New ID',
      status: 'released',
      submitted_at: '2025-08-10T09:30:00.000Z',
    },
  ],

  statusHistory: [
    {
      id: 1,
      application_id: 1,
      from_status: null,
      to_status: 'submitted',
      changed_by: 1,
      changed_at: '2025-08-10T09:30:00.000Z',
    },
    {
      id: 2,
      application_id: 1,
      from_status: 'submitted',
      to_status: 'processing',
      changed_by: 2,
      changed_at: '2025-08-11T10:00:00.000Z',
    },
    {
      id: 3,
      application_id: 1,
      from_status: 'processing',
      to_status: 'ready',
      changed_by: 2,
      changed_at: '2025-08-14T11:20:00.000Z',
    },
    {
      id: 4,
      application_id: 1,
      from_status: 'ready',
      to_status: 'released',
      changed_by: 2,
      changed_at: '2025-08-15T15:00:00.000Z',
    },
  ],

  cards: [
    {
      id: 1,
      card_number: 'WMSU-2025-01190-CRD',
      student_id: 1,
      application_id: 1,
      status: 'active',
      issue_date: '2025-08-15',
      valid_until: '2029-08-15',
    }
  ],

  reissuanceRequests: []
};

export { nextId };
