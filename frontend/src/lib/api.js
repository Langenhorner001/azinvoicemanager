import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

export const api = axios.create({ baseURL: API_URL });

// ─── Invoices ───────────────────────────────────────────────────────────────

export const listInvoices = (params) =>
  api.get('/invoices', { params }).then(r => r.data);

export const getNextInvoiceNumber = () =>
  api.get('/invoices/next-number').then(r => r.data);

export const getInvoice = (id) =>
  api.get(`/invoices/${id}`).then(r => r.data);

export const createInvoice = (data) =>
  api.post('/invoices', data).then(r => r.data);

export const updateInvoice = (id, data) =>
  api.put(`/invoices/${id}`, data).then(r => r.data);

export const deleteInvoice = (id) =>
  api.delete(`/invoices/${id}`);

// ─── Customers ──────────────────────────────────────────────────────────────

export const listCustomers = () =>
  api.get('/customers').then(r => r.data);

export const createCustomer = (data) =>
  api.post('/customers', data).then(r => r.data);

export const updateCustomer = (id, data) =>
  api.put(`/customers/${id}`, data).then(r => r.data);

export const deleteCustomer = (id) =>
  api.delete(`/customers/${id}`);

// ─── Products ───────────────────────────────────────────────────────────────

export const listProducts = () =>
  api.get('/products').then(r => r.data);

export const createProduct = (data) =>
  api.post('/products', data).then(r => r.data);

export const updateProduct = (id, data) =>
  api.put(`/products/${id}`, data).then(r => r.data);

export const deleteProduct = (id) =>
  api.delete(`/products/${id}`);
