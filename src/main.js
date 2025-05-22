import axios from 'axios';

const uploadForm = document.getElementById('uploadForm');
const todoList = document.getElementById('todoList');
const toastContainer = document.getElementById('toast-container');
const API_BASE_URL = 'http://localhost:3000/api';

// --- MULTIMODAL INPUT ELEMENTS ---
const multimodalInput = document.getElementById('multimodal-input');
const addImageButton = document.getElementById('add-image-button');
const hiddenImageUpload = document.getElementById('hidden-image-upload');
const submitTodoButton = document.getElementById('submit-todo-button');


// --- TOAST FXN --- (Keep existing)
function showToast(message, type = 'info', duration = 3000) {
  if (!toastContainer) {
    console.error("Toast container not found!");
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
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

// --- Data URL to Blob ---
function dataURLtoBlob(dataurl) {
    try {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    } catch (error) {
        console.error("Error in dataURLtoBlob:", error);
        showToast("Error processing pasted image data.", "error");
        return null;
    }
}

// --- insert image file into contenteditable ---
function insertImageFileIntoInput(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Invalid file type. Please select an image.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result; 
        appendNodeAtCursor(multimodalInput, img);
        const br = document.createElement('br');
        appendNodeAtCursor(multimodalInput, br); 
    };
    reader.readAsDataURL(file);
}

// --- append node at cursor in contenteditable ---
function appendNodeAtCursor(parentElement, newNode) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents(); 
        
        if (range.commonAncestorContainer === parentElement || parentElement.contains(range.commonAncestorContainer)) {
            range.insertNode(newNode);
            range.setStartAfter(newNode);
            range.setEndAfter(newNode);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            parentElement.appendChild(newNode);
        }
    } else {
        parentElement.appendChild(newNode);
    }
    multimodalInput.focus();
}

// --- MULTIMODAL INPUT EVENT LISTENERS ---
// Paste event
multimodalInput.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    let imagePasted = false;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            event.preventDefault(); 
            const file = item.getAsFile();
            if (file) {
                 insertImageFileIntoInput(file);
                 imagePasted = true;
            }
        }
    }
});

// Add image button
addImageButton.addEventListener('click', () => {
    hiddenImageUpload.click();
});

hiddenImageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        insertImageFileIntoInput(file);
    }
    hiddenImageUpload.value = ''; // Reset file input
});

// Ctrl+Enter to submit
multimodalInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        uploadForm.requestSubmit ? uploadForm.requestSubmit(submitTodoButton) : submitTodoButton.click();
    }
});


function parseGeminiOutput(text) {
    const details = {
        company: '',
        roleAndExp: '',
        actions: [],
        contact: '',
        location: '',
        raw: text // keep raw text for fallback or if parsing fails
    };
    if (!text || typeof text !== 'string') return details;

    const lines = text.split('\n');
    let currentSection = null;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('Hiring Company:')) {
            details.company = trimmedLine.substring('Hiring Company:'.length).trim();
            currentSection = null;
        } else if (trimmedLine.startsWith('Job Role(s) & Experience:')) {
            details.roleAndExp = trimmedLine.substring('Job Role(s) & Experience:'.length).trim();
            currentSection = null;
        } else if (trimmedLine.startsWith('Primary Application Action(s):')) {
            currentSection = 'actions';
        } else if (trimmedLine.startsWith('Key Contact for Application:')) {
            details.contact = trimmedLine.substring('Key Contact for Application:'.length).trim();
            currentSection = null;
        } else if (trimmedLine.startsWith('Location:')) {
            details.location = trimmedLine.substring('Location:'.length).trim();
            currentSection = null;
        } else if (currentSection === 'actions' && trimmedLine.startsWith('Action:')) {
            details.actions.push(trimmedLine.substring('Action:'.length).trim());
        }
    }
    return details;
}

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
    const parsedInfo = parseGeminiOutput(todo.text);

    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'todo-header-wrapper';

    const heading = document.createElement('h4');
    heading.textContent = parsedInfo.company ? `Job at: ${parsedInfo.company}` : 'Job Application Details';

    const collapseButton = document.createElement('button');
    collapseButton.textContent = '+'; 
    collapseButton.className = 'collapse-btn';
    collapseButton.setAttribute('aria-expanded', 'false'); 

    headerWrapper.appendChild(heading);
    headerWrapper.appendChild(collapseButton);
    textContainer.appendChild(headerWrapper);

    const detailsList = document.createElement('ul');
    detailsList.className = 'todo-details-list collapsed'; 

    let detailsHtml = '';
    let hasAnyStructuredDetail = false; 

    if (parsedInfo.roleAndExp) {
        detailsHtml += `<li><strong>Role & Experience:</strong> ${parsedInfo.roleAndExp}</li>`;
        hasAnyStructuredDetail = true;
    }
    if (parsedInfo.location) {
        detailsHtml += `<li><strong>Location:</strong> ${parsedInfo.location}</li>`;
        hasAnyStructuredDetail = true;
    }
    if (parsedInfo.contact) {
        detailsHtml += `<li><strong>Key Contact:</strong> ${parsedInfo.contact}</li>`;
        hasAnyStructuredDetail = true;
    }

    if (parsedInfo.actions.length > 0) {
        detailsHtml += `<li><strong>Primary Application Action(s):</strong><ul>`;
        parsedInfo.actions.forEach(action => {
            let actionHtml = action;
            const linkMatch = action.match(/Apply via Link:\s*(https?:\/\/[^\s]+)/i);
            if (linkMatch && linkMatch[1]) {
                actionHtml = `Apply via Link: <a href="${linkMatch[1]}" target="_blank" rel="noopener noreferrer">${linkMatch[1]}</a>`;
            }
            detailsHtml += `<li>${actionHtml}</li>`;
        });
        detailsHtml += `</ul></li>`;
        hasAnyStructuredDetail = true;
    }

    if (!hasAnyStructuredDetail && parsedInfo.raw) { 
        detailsHtml += `<li><strong>Full Details:</strong><pre class="raw-details-text">${parsedInfo.raw.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></li>`;
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
    statusSpan.textContent = `${todo.status}`;
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

// --- MODIFIED FORM SUBMISSION ---
uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  let imageFile = null;
  let userTextContent = ""; // For potential future use if backend supports text + image

  // Extract content from multimodal input
  const childNodes = multimodalInput.childNodes;
  for (const node of childNodes) {
    if (node.nodeName === 'IMG' && node.src) {
      if (!imageFile) { // Take the first image encountered
        try {
          const blob = await (node.src.startsWith('data:') ? dataURLtoBlob(node.src) : fetch(node.src).then(res => res.blob()));
          if (blob) {
             imageFile = new File([blob], "pasted_image.png", { type: blob.type });
          }
        } catch (e) {
          console.error("Error converting image src to file:", e);
          showToast('Error processing pasted image for submission.', 'error');
          return;
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      userTextContent += node.textContent;
    } else if (node.nodeName === 'DIV' || node.nodeName === 'P' || node.nodeName === 'BR') { 
      userTextContent += node.textContent || (node.nodeName === 'BR' ? '\n' : '');
    }
  }
  userTextContent = userTextContent.trim();

  if (!imageFile && hiddenImageUpload.files.length > 0) {
      imageFile = hiddenImageUpload.files[0];
  }

  if (!imageFile) {
    // If the JTodo app *strictly* requires an image, this is an error.
    // If text alone could create a different kind of todo, handle that here.
    // For now, assuming image is required for '/process-image'.
    showToast('Please include an image (screenshot) for the todo.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('screenshot', imageFile);
  // If your backend evolves to handle user-typed text along with the image:
  // if (userTextContent) {
  //   formData.append('user_text', userTextContent);
  // }

  showToast('Processing screenshot... Please wait.', 'info', 5000);

  try {
    const response = await axios.post(`${API_BASE_URL}/process-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.todo && response.data.todo.id) {
      showToast("Todo created successfully!", 'success');
      fetchTodos();
      multimodalInput.innerHTML = ''; 
      hiddenImageUpload.value = '';
    } else if (response.data.message && response.data.message.includes('No text found')) {
      showToast('No text could be extracted from the image.', 'info');
    } else {
      const message = response.data.message || 'Unexpected response during processing.';
      showToast(`Image processed, but issue creating todo: ${message}`, 'error');
    }
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