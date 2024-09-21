document.addEventListener('DOMContentLoaded', function() {
    function adminValidateForm(event) {     
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorMsg = document.getElementById('errorMsg');

      if (!username) {
        errorMsg.textContent = "Username Required";
        event.preventDefault();
        return false;
      }
      if (!password) {
        errorMsg.textContent = "Password Required";
        event.preventDefault();
        return false;
      }
      return true;
    }

    document.getElementById('adminloginform').addEventListener('submit', adminValidateForm);
  });