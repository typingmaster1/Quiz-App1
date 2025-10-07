/* ------------------- Helper Functions ------------------- */
function $(id){ return document.getElementById(id); }
function escapeHtml(str){
  return str.replace(/[&<>'"]/g, tag => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[tag] || tag
  ));
}

/* ------------------- Global State ------------------- */
let quizData = [];
let currentQIndex = 0;
let score = 0;
let student = null;
let timer;          // ⏱ timer interval reference
let timeLeft = 30;  // default 30 sec per question

/* ------------------- Panels ------------------- */
function showPanel(panel){
  document.querySelectorAll('.panel').forEach(p=>p.style.display="none");
  $(panel).style.display="block";
}

/* ------------------- Student Login ------------------- */
$('studentForm').addEventListener('submit', e=>{
  e.preventDefault();
  student = {
    name: $('sname').value.trim(),
    roll: $('sroll').value.trim(),
    category: $('scategory').value,
    difficulty: $('sdifficulty').value,
    date: new Date().toLocaleString()
  };
  startQuiz();
});

/* ------------------- Start Quiz (API Call) ------------------- */
async function startQuiz(){
  try {
    const url = `https://opentdb.com/api.php?amount=10&difficulty=${student.difficulty}&type=multiple`;
    const res = await fetch(url);
    const data = await res.json();

    quizData = data.results.map(q => {
      const allOptions = [...q.incorrect_answers, q.correct_answer];
      return {
        q: q.question,
        options: shuffle(allOptions),
        answer: q.correct_answer
      };
    });

    currentQIndex = 0;
    score = 0;
    showPanel('quiz');
    loadQuestion();
  } catch (err) {
    alert("Failed to load quiz questions from API.");
    console.error(err);
  }
}

/* ------------------- Question Loader ------------------- */
function loadQuestion(){
  clearInterval(timer);   // stop old timer
  timeLeft = 30;          // reset timer
  updateTimer();          // show timer immediately
  timer = setInterval(()=>{
    timeLeft--;
    updateTimer();
    if(timeLeft <= 0){
      clearInterval(timer);
      lockOptions();  // disable options when time up
      $('nextBtn').disabled = false; 
    }
  },1000);

  const q = quizData[currentQIndex];
  $('question').innerHTML = `<h3>Q${currentQIndex+1}: ${escapeHtml(q.q)}</h3>`;
  $('options').innerHTML = q.options.map((opt,i)=>
    `<label class="option">
       <input type="radio" name="opt" value="${escapeHtml(opt)}" onclick="checkAnswer(this, '${escapeHtml(q.answer)}')">
       ${escapeHtml(opt)}
     </label><br>`
  ).join('');
  $('nextBtn').disabled = true; // disable until answer selected or time up
}

/* ------------------- Timer Display ------------------- */
function updateTimer(){
  if(!$('timerBox')){
    const div=document.createElement('div');
    div.id="timerBox";
    div.style.fontWeight="bold";
    div.style.margin="10px 0";
    $('quiz').insertBefore(div,$('question'));
  }
  $('timerBox').innerText = `⏱ Time Left: ${timeLeft}s`;
}

/* ------------------- Lock Options ------------------- */
function lockOptions(){
  const allOptions = document.querySelectorAll('input[name="opt"]');
  allOptions.forEach(opt => opt.disabled = true);
}

/* ------------------- Answer Checker ------------------- */
function checkAnswer(input, correctAnswer){
  lockOptions(); // disable all after selection
  const selectedLabel = input.parentElement;
  
  if(input.value === correctAnswer){
    selectedLabel.classList.add('correct');
    score++;
  } else {
    selectedLabel.classList.add('wrong');
    document.querySelectorAll('input[name="opt"]').forEach(opt=>{
      if(opt.value === correctAnswer){
        opt.parentElement.classList.add('correct');
      }
    });
  }
  $('nextBtn').disabled = false; // enable next
  clearInterval(timer); // stop timer on answer
}

/* ------------------- Next Button ------------------- */
$('nextBtn').addEventListener('click', ()=>{
  currentQIndex++;
  if(currentQIndex < quizData.length) loadQuestion();
  else submitQuiz();
});


/* ------------------- Submit Quiz ------------------- */
function submitQuiz(){
  clearInterval(timer);
  const result = {
    student,
    score: Math.round((score/quizData.length)*100),
    date: new Date().toLocaleString()
  };
  let records = JSON.parse(localStorage.getItem('records') || "[]");
  records.push(result);
  localStorage.setItem('records', JSON.stringify(records));

  let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || "[]");
  leaderboard.push(result);
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));

  showResult(result);
}

/* ------------------- Result ------------------- */
function showResult(result){
  showPanel('result');
  $('resultSummary').innerHTML = `
    <h3>Result Summary</h3>
    <p><strong>Name:</strong> ${escapeHtml(result.student.name)}</p>
    <p><strong>Roll #:</strong> ${escapeHtml(result.student.roll)}</p>
    <p><strong>Category:</strong> ${escapeHtml(result.student.category)}</p>
    <p><strong>Difficulty:</strong> ${escapeHtml(result.student.difficulty)}</p>
    <p><strong>Score:</strong> ${result.score}%</p>
    <p><strong>Date:</strong> ${escapeHtml(result.date)}</p>
  `;
}

$('downloadBtn').addEventListener('click', ()=>{
  const c = document.createElement('canvas');
  c.width=600; c.height=400;
  const ctx=c.getContext('2d');
  ctx.fillStyle="#fdf6e3"; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle="#000"; ctx.font="20px Arial";
  ctx.fillText("Certificate of Achievement",150,80);
  ctx.font="16px Arial";
  ctx.fillText(`This certifies that ${student.name}`,100,150);
  ctx.fillText(`has successfully completed the quiz`,100,180);
  ctx.fillText(`Category: ${student.category} (${student.difficulty})`,100,210);
  ctx.fillText(`Score: ${score}/${quizData.length}`,100,240);
  ctx.fillText(`Date: ${new Date().toLocaleDateString()}`,100,270);
  const link=document.createElement('a');
  link.download="certificate.png";
  link.href=c.toDataURL();
  link.click();
});

/* ------------------- Leaderboard ------------------- */
$('leaderboardBtn').addEventListener('click', ()=>{
  showLeaderboard();
  showPanel('leaderboard');
});

function showLeaderboard(){
  let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || "[]");
  const sorted = leaderboard.sort((a,b)=> b.score - a.score);

  leaderboardList.innerHTML = sorted.length 
    ? sorted.map((r, i)=> {
        const s = r.student;
        return `<div class="review-item">
          <strong>${i+1}. ${escapeHtml(s.name)}</strong> (Roll: ${escapeHtml(s.roll)}) 
          - Score: ${r.score}% 
          - ${escapeHtml(s.category)}/${escapeHtml(s.difficulty)} 
          <br><small>${escapeHtml(r.date)}</small>
        </div>`;
      }).join('')
    : '<p>No records yet.</p>';
}

/* ------------------- Reset Leaderboard ------------------- */
function resetLeaderboard(){
  if(confirm("Are you sure you want to reset the leaderboard?")){
    localStorage.removeItem('leaderboard');
    showLeaderboard();
  }
}

/* ------------------- Admin ------------------- */
$('adminForm').addEventListener('submit', e=>{
  e.preventDefault();
  const u=$('adminUser').value, p=$('adminPass').value;
  if(u==="admin" && p==="1234"){ showAdmin(); showPanel('adminPanel'); }
  else alert("Invalid admin credentials");
});

function showAdmin(){
  let records = JSON.parse(localStorage.getItem('records') || "[]");
  $('adminRecords').innerHTML = records.length
    ? records.map((r,i)=>`<div class="review-item">
        ${i+1}. ${escapeHtml(r.student.name)} (Roll: ${escapeHtml(r.student.roll)}) 
        - ${r.score}% - ${escapeHtml(r.date)}
      </div>`).join('')
    : "<p>No records available</p>";
}

/* ------------------- Helpers ------------------- */
function shuffle(arr){ return arr.sort(()=>Math.random()-0.5); }
