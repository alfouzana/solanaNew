import React from "react";

const Input = ({ icon, placeholder, handleChange }) => (
  <div className="input-container">
    {icon}
    <input placeholder={placeholder} onChange={handleChange} />
  </div>
);

export default Input;
