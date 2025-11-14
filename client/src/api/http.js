import axios from "axios";

export const http = axios.create({
  baseURL: "https://bookmybus-backend1.onrender.com", // backend origin
  withCredentials: true,
});
