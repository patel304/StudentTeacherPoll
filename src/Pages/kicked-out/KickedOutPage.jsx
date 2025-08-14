import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const KickedOutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure any residual session is cleared
    sessionStorage.removeItem("username");
  }, []);

  const handleBackToLogin = () => {
    sessionStorage.removeItem("username");
    navigate("/");
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <h2 className="mb-3">You've been kicked out!</h2>
        <p className="text-muted mb-4">Please contact your teacher if you think this was a mistake.</p>
        <button className="btn btn-primary" onClick={handleBackToLogin}>
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default KickedOutPage;