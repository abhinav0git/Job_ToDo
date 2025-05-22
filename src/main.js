import axios from 'axios';

const uploadForm = document.getElementById('uploadForm');
const screenshotFile = document.getElementById('screenshotFile');

const todoList = document.getElementById('todoList');

const toastContainer = document.getElementById('toast-container');


const API_BASE_URL = 'http://localhost:3000/api';

// --- TOAST FXN ---
function showToast(message, type = 'info', duration = 3000) {
  if (!toastContainer) {
    console.error("Toast container not found!");
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`; // toast info, toast success, toast error etc
  toast.textContent = message;

  toastContainer.appendChild(toast);
  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, { once: true });
  }, duration);
}
// --- END OF TOAST FXN ---

async function fetchTodos() {
  try {
    const response = await axios.get(`${API_BASE_URL}/todos`);
    renderTodos(response.data);
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    showToast('Failed to load todos. Please try refreshing.', 'error');
  }
}

function renderTodos(todos) {
  todoList.innerHTML = '';
  if (!todos || todos.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No todos yet. Upload a screenshot to create one!';
    li.classList.add('no-todos-message');
    todoList.appendChild(li);
    return;
  }

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.dataset.id = todo._id;
    li.className = todo.status === 'completed' ? 'completed' : '';

    const textContainer = document.createElement('div');
    textContainer.className = 'todo-text-container';

    const details = todo.text.split(';');
    const recipientEmail = details[0]?.trim() || '';
    const role = details[1]?.trim() || '';
    const onsiteOffsite = details[2]?.trim() || '';
    const jobDescription = details[3]?.trim() || '';
    const yearsOfExperience = details[4]?.trim() || '';
    const companyName = details[5]?.trim() || '';
    const techRequirements = details[6]?.trim() || '';

    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'todo-header-wrapper';

    const heading = document.createElement('h4');
    heading.textContent = `Application Details for ${companyName || 'N/A'}`;

    const collapseButton = document.createElement('button');
    collapseButton.textContent = '+'; 
    collapseButton.className = 'collapse-btn';
    collapseButton.setAttribute('aria-expanded', 'false'); 

    headerWrapper.appendChild(heading);
    headerWrapper.appendChild(collapseButton);
    textContainer.appendChild(headerWrapper);

    const detailsList = document.createElement('ul');
    detailsList.className = 'todo-details-list collapsed'; 

    // combined summary line
    let detailsHtml = '';
    let hasAnyStructuredDetail = false; // to track if any primary fields or "more" info is present

    if (yearsOfExperience || companyName || onsiteOffsite || role) {
      detailsHtml += '<li>';
      detailsHtml += '<strong>Summary:</strong> ';
      detailsHtml += 'Require ';
      detailsHtml += yearsOfExperience ? `${yearsOfExperience} YOE,` : ' yoe? ';
      detailsHtml += onsiteOffsite ? ` ${onsiteOffsite} ` : ' onsiteoffsite? ';
      detailsHtml += ' for ';
      detailsHtml += role ? `${role}` : ' role? ';
      detailsHtml += '</li>';
      hasAnyStructuredDetail = true;
    }

    if (recipientEmail) {
        detailsHtml += `<li><strong>Recipient Email:</strong> ${recipientEmail}</li>`;
        hasAnyStructuredDetail = true;
    }
    if (jobDescription) {
        detailsHtml += `<li><strong>Job Desc:</strong> ${jobDescription}</li>`;
        hasAnyStructuredDetail = true;
    }
    if (techRequirements) {
        detailsHtml += `<li><strong>Tech Requirements:</strong> ${techRequirements}</li>`;
        hasAnyStructuredDetail = true;
    }

    const moreInfoParts = details.slice(7).map(part => part.trim()).filter(part => part.length > 0);
    if (moreInfoParts.length > 0) {
        const moreInfoText = moreInfoParts.join('; '); 
        detailsHtml += `<li><strong>More:</strong> ${moreInfoText}</li>`;
        hasAnyStructuredDetail = true;
    }

    if (!hasAnyStructuredDetail) {
        detailsHtml += `<li>No specific details extracted. Full text: ${todo.text}</li>`;
    }
    detailsList.innerHTML = detailsHtml;
    textContainer.appendChild(detailsList);

    collapseButton.addEventListener('click', () => {
        detailsList.classList.toggle('collapsed');
        const isCollapsed = detailsList.classList.contains('collapsed');
        collapseButton.textContent = isCollapsed ? '+' : '-';
        collapseButton.setAttribute('aria-expanded', !isCollapsed);
    });

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';

    const statusSpan = document.createElement('span');
    statusSpan.className = 'status';
    statusSpan.textContent = `Status: ${todo.status}`;
    actionsDiv.appendChild(statusSpan);

    if (todo.status === 'pending') {
      const completeButton = document.createElement('button');
      completeButton.textContent = 'Mark Complete';
      completeButton.classList.add('complete-btn');
      completeButton.addEventListener('click', () => updateTodoStatus(todo._id, 'completed'));
      actionsDiv.appendChild(completeButton);
    } else {
      const pendingButton = document.createElement('button');
      pendingButton.textContent = 'Mark Pending';
      pendingButton.classList.add('pending-btn');
      pendingButton.addEventListener('click', () => updateTodoStatus(todo._id, 'pending'));
      actionsDiv.appendChild(pendingButton);
    }

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete-btn');
    deleteButton.addEventListener('click', () => deleteTodoItem(todo._id));
    actionsDiv.appendChild(deleteButton);

    li.appendChild(textContainer);
    li.appendChild(actionsDiv);
    todoList.appendChild(li);
  });
}

async function updateTodoStatus(id, status) {
  try {
    showToast(`Updating status for todo...`, 'info', 1500);
    await axios.put(`${API_BASE_URL}/todos/${id}`, { status });
    showToast('Todo status updated successfully.', 'success');
    fetchTodos();
  } catch (error) {
    console.error('Failed to update todo status:', error);
    const errorMsg = error.response?.data?.error || error.message;
    showToast(`Failed to update status: ${errorMsg}`, 'error');
  }
}

async function deleteTodoItem(id) {
  try {
    if (!confirm('Are you sure you want to delete this todo?')) return;
    showToast(`Deleting todo...`, 'info', 1500);
    await axios.delete(`${API_BASE_URL}/todos/${id}`);
    showToast('Todo deleted successfully.', 'success');
    fetchTodos();
  } catch (error) {
    console.error('Failed to delete todo:', error);
    const errorMsg = error.response?.data?.error || error.message;
    showToast(`Failed to delete todo: ${errorMsg}`, 'error');
  }
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!screenshotFile.files.length) {
    showToast('Please select an image first.', 'error');
    return;
  }

  const file = screenshotFile.files[0];
  const formData = new FormData();
  formData.append('screenshot', file);

  showToast('Processing screenshot... Please wait.', 'info', 5000);

  try {
    const response = await axios.post(`${API_BASE_URL}/process-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.todo && response.data.todo.id) {
      let successMsg = "Todo created successfully!";
      showToast(successMsg, 'success');
      fetchTodos();
    } else if (response.data.message && response.data.message.includes('No text found')) {
      showToast('No text could be extracted from the image.', 'info');
    } else {
      const message = response.data.message || 'Unexpected response during processing.';
      showToast(`Image processed, but issue creating todo: ${message}`, 'error');
    }
    screenshotFile.value = '';
  } catch (err) {
    console.error(err);
    let errorMessage = 'Something went wrong while processing the image.';
    if (err.response?.data?.details) {
        errorMessage += ` Details: ${err.response.data.details}`;
    } else if (err.response?.data?.error) {
        errorMessage += ` Error: ${err.response.data.error}`;
    }
    showToast(errorMessage, 'error', 5000);
  }
});



document.addEventListener('DOMContentLoaded', fetchTodos);