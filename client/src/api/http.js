import axios from "axios";

export const http = axios.create({
  baseURL: "https://bus-qubitz.onrender.com", // backend origin
  withCredentials: true,
});
