import axios from "axios";

export const http = axios.create({
  baseURL: "https://bookmybus-backend2.onrender.com", // backend origin
  withCredentials: true,
});
