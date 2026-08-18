import { useCallback, useEffect, useState } from 'react';
import http from '../api/http';
import { useAuth } from '../auth/AuthContext';
import './leads-v3.css';

const statuses=['new','interested','file_update','login','sanction','pf_paid','disbursed','rejected'];
const empty={name:'',phone:'',email:'',country:'',university:'',loanAmount:'',studentName:'',coApplicant:'',occupation:'',entranceExam:'',source:'Direct',remarks:'',loginCity:'',sanctionCity:'',creditScore:'',status:'new',assignedTo:''};
const nice=x=>String(x||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const money=x=>Number(x||0).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
const convert=x=>({name:x.name||'',phone:x.phone||'',email:x.email||'',country:x.country||'',university:x.university||'',loanAmount:x.loan_amount||'',studentName:x.student_name||'',coApplicant:x.co_applicant||'',occupation:x.occupation||'',entranceExam:x.entrance_exam||'',source:x.source||'Direct',remarks:x.remarks||'',loginCity:x.login_city||'',sanctionCity:x.sanction_city||'',creditScore:x.credit_score||'',status:x.status||'new',assignedTo:x.assigned_to||''});

function parseCsv(text){const rows=[];let r=[],v='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){v+='"';i++;}else if(c==='"')q=!q;else if(c===','&&!q){r.push(v.trim());v='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;r.push(v.trim());if(r.some(Boolean))rows.push(r);r=[];v='';}else v+=c;}r.push(v.trim());if(r.some(Boolean))rows.push(r);return rows;}
const map={name:'name',phone:'phone',mobile:'phone',email:'email',country:'country',university:'university',loan_amount:'loanAmount',student_name:'studentName',co_applicant:'coApplicant',occupation:'occupation',entrance_exam:'entranceExam',source:'source',remarks:'remarks',login_city:'loginCity',sanction_city:'sanctionCity',credit_score:'creditScore',status:'status',assigned_to:'assignedTo'};

export default function LeadManagementV3(){
  const {user}=useAuth();
  const canManage=user?.permissions?.includes('leads.manage');
  const isLoanAdvisor=user?.roleKey==='loan_advisor'||user?.role==='Loan Advisor';
  const canViewEdit=canManage||isLoanAdvisor||user?.permissions?.includes('leads.view')||user?.permissions?.includes('calling.view');

  const [rows,setRows]=useState([]),[meta,setMeta]=useState({sources:[],users:[]}),[filter,setFilter]=useState({search:'',status:'',source:'',page:1}),[page,setPage]=useState({page:1,pages:1,total:0}),[modal,setModal]=useState(null),[detail,setDetail]=useState(null),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const q=new URLSearchParams({page:String(filter.page),limit:'10'});
      Object.entries(filter).forEach(([k,v])=>{if(v&&k!=='page')q.set(k,v)});
      const [list,info]=await Promise.all([http.get(`/leads?${q}`),http.get('/leads/meta')]);
      setRows(list.data.leads);
      setPage(list.data.pagination);
      setMeta(info.data);
    }catch(e){
      setNotice(e.response?.data?.error||'Unable to load leads');
    }finally{
      setLoading(false);
    }
  },[filter]);

  useEffect(()=>{load()},[load]);

  const setF=(key,value)=>setFilter(old=>({...old,[key]:value,page:key==='page'?value:1}));

  const save=async e=>{
    e.preventDefault();
    try{
      if(modal.id)await http.patch(`/leads/${modal.id}`,modal.data);
      else await http.post('/leads',modal.data);
      setModal(null);
      load();
    }catch(err){
      setNotice(err.response?.data?.error||'Unable to save lead');
    }
  };

  const remove=async item=>{
    if(!confirm(`Delete lead ${item.name}?`))return;
    try{
      await http.delete(`/leads/${item.id}`);
      load();
    }catch(err){
      setNotice(err.response?.data?.error||'Unable to delete lead');
    }
  };

  const download=()=>{
    const csv='name,phone,email,country,university,loan_amount,entrance_exam,source,status\nAarav Sharma,9876543210,aarav@example.com,Canada,York University,3200000,GRE / IELTS,Website,interested';
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a=document.createElement('a');
    a.href=url;
    a.download='lead-upload-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const data=parseCsv(await file.text()),headers=(data.shift()||[]).map(x=>map[x.toLowerCase().trim().replaceAll(' ','_')]||'');
    const leads=data.map(row=>Object.fromEntries(row.map((value,i)=>[headers[i],value]).filter(([key])=>key)));
    try{
      const result=await http.post('/leads/bulk',{leads});
      setNotice(`${result.data.imported} leads imported${result.data.skipped?`; ${result.data.skipped} rows skipped`:''}`);
      load();
    }catch(err){
      setNotice(err.response?.data?.error||'Bulk upload failed');
    }
    e.target.value='';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <section className="page leads3">
      {/* Header */}
      <div className="l3head">
        <div>
          <span>CRM PIPELINE</span>
          <h1>Lead management</h1>
          <p>Collect, qualify and manage every student loan lead.</p>
        </div>
        {canManage && (
          <div className="l3actions">
            <button className="secondary" onClick={download}>Download CSV</button>
            <label className="secondary">
              Bulk upload
              <input type="file" accept=".csv,text/csv" onChange={upload}/>
            </label>
            <button className="primary" onClick={()=>setModal({id:null,data:empty})}>+ Add new lead</button>
          </div>
        )}
      </div>

      {notice && (
        <div className="l3notice">
          {notice}
          <button onClick={()=>setNotice('')}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="l3filters">
        <label>
          ⌕ <input value={filter.search} placeholder="Search name, phone, email, university or entrance exam" onChange={e=>setF('search',e.target.value)}/>
        </label>
        <select value={filter.status} onChange={e=>setF('status',e.target.value)}>
          <option value="">All statuses</option>
          {statuses.map(x=><option key={x} value={x}>{nice(x)}</option>)}
        </select>
        <select value={filter.source} onChange={e=>setF('source',e.target.value)}>
          <option value="">All sources</option>
          {meta.sources.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
        <button onClick={()=>setFilter({search:'',status:'',source:'',page:1})}>Clear</button>
      </div>

      <div className="l3count">
        <span><b>{page.total}</b> leads found</span>
        <span>Page {page.page} of {page.pages}</span>
      </div>

      {/* Table */}
      <div className="l3table">
        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>NAME</th>
              <th>NUMBER</th>
              <th>EMAIL</th>
              <th>COUNTRY</th>
              <th>UNIVERSITY</th>
              <th>ENTRANCE EXAM</th>
              <th>LOAN AMOUNT</th>
              <th>STUDENT-WE</th>
              <th>CO-APPLICANT</th>
              <th>OCCUPATION</th>
              <th>CITY</th>
              <th>INTERESTED</th>
              <th>FILES UPDATE</th>
              <th>REMINDER</th>
              <th>REMARKS</th>
              <th style={{ textAlign: 'center' }} title="Actions (View/Edit)">ACTIONS</th>
              <th style={{ textAlign: 'center' }} title="WhatsApp Chat"><WhatsAppIcon /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="18" className="empty">Loading leads data...</td>
              </tr>
            ) : rows.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.created_at)}</td>
                <td style={{ fontWeight: '700' }}>
                  <span
                    onClick={() => setDetail(item)}
                    style={{ cursor: 'pointer', color: '#28364e' }}
                    title="Click to view details"
                  >
                    {item.name}
                  </span>
                </td>
                <td>
                  <a href={`tel:${item.phone}`} style={{ color: '#6500d6', fontWeight: 600 }}>{item.phone}</a>
                </td>
                <td>{item.email || '—'}</td>
                <td>{item.country || '—'}</td>
                <td>{item.university || '—'}</td>
                <td>{item.entrance_exam || '—'}</td>
                <td style={{ fontWeight: '600' }}>{money(item.loan_amount)}</td>
                <td>{item.student_name || '—'}</td>
                <td>{item.co_applicant || '—'}</td>
                <td>{item.occupation || '—'}</td>
                <td>{item.login_city || item.sanction_city || '—'}</td>
                <td><span className={`badge s-${item.status}`}>{nice(item.status)}</span></td>
                <td>{item.status === 'file_update' ? 'Files Updated' : '—'}</td>
                <td>{item.follow_up_at ? formatDate(item.follow_up_at) : '—'}</td>
                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.remarks || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    {canViewEdit && (
                      <>
                        <button className="action-btn-view" title="View lead details" onClick={() => setDetail(item)}>
                          <EyeIcon />
                        </button>
                        <button className="action-btn-edit" title="Edit lead" onClick={() => setModal({ id: item.id, data: convert(item) })}>
                          <EditIcon />
                        </button>
                      </>
                    )}
                    {canManage && (
                      <button className="action-btn-delete" title="Delete lead" onClick={() => remove(item)}>
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <a
                    href={`https://wa.me/91${item.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn-wa"
                    title="Chat on WhatsApp"
                  >
                    <WhatsAppIcon />
                  </a>
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan="18" className="empty">No leads found matching your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="l3pager">
        <button disabled={page.page <= 1} onClick={() => setF('page', page.page - 1)}>← Previous</button>
        <span>{page.page} / {page.pages}</span>
        <button disabled={page.page >= page.pages} onClick={() => setF('page', page.page + 1)}>Next →</button>
      </div>

      {modal && <LeadForm modal={modal} setModal={setModal} meta={meta} save={save} isLoanAdvisor={isLoanAdvisor} currentUser={user} />}
      {detail && <ViewLead item={detail} close={() => setDetail(null)} />}
    </section>
  );
}

function LeadForm({modal,setModal,meta,save,isLoanAdvisor,currentUser}){
  const update=(key,value)=>setModal({...modal,data:{...modal.data,[key]:value}}),f=modal.data;
  const input=(key,label,type='text')=><label>{label}<input type={type} value={f[key]} onChange={e=>update(key,e.target.value)}/></label>;
  return (
    <div className="overlay">
      <form className="lead-form" onSubmit={save}>
        <div className="modal-top">
          <div>
            <span>{modal.id?'UPDATE LEAD':'NEW LEAD'}</span>
            <h2>{modal.id?'Edit lead':'Create new lead'}</h2>
          </div>
          <button type="button" onClick={()=>setModal(null)}>×</button>
        </div>
        <div className="fields">
          <label>Lead name *<input value={f.name} onChange={e=>update('name',e.target.value)} required/></label>
          <label>Phone number *<input value={f.phone} onChange={e=>update('phone',e.target.value)} required/></label>
          {input('email','Email','email')}
          {input('studentName','Student name')}
          {input('country','Country')}
          {input('university','University')}
          {input('loanAmount','Loan amount','number')}
          {input('creditScore','Credit score','number')}
          {input('entranceExam','Entrance exam')}
          {input('coApplicant','Co-applicant')}
          {input('occupation','Occupation')}
          {input('source','Source')}
          <label>Status<select value={f.status} onChange={e=>update('status',e.target.value)}>{statuses.map(x=><option key={x} value={x}>{nice(x)}</option>)}</select></label>
          {input('loginCity','Login city')}
          {input('sanctionCity','Sanction city')}
          <label>Assign to
            <select value={f.assignedTo} onChange={e=>update('assignedTo',e.target.value)}>
              {isLoanAdvisor?(
                <option value={currentUser?.id}>{currentUser?.name||currentUser?.email||'Loan Adviser'}</option>
              ):(
                <>
                  <option value="">Unassigned</option>
                  {meta.users.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                </>
              )}
            </select>
          </label>
          <label className="full">Remarks<textarea rows="3" value={f.remarks} onChange={e=>update('remarks',e.target.value)}/></label>
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary" onClick={()=>setModal(null)}>Cancel</button>
          <button className="primary">{modal.id?'Save changes':'Create lead'}</button>
        </div>
      </form>
    </div>
  );
}

function ViewLead({item,close}){
  const values=[
    ['Phone',item.phone],
    ['Email',item.email],
    ['Country',item.country],
    ['University',item.university],
    ['Entrance exam',item.entrance_exam||'—'],
    ['Loan amount',money(item.loan_amount)],
    ['Source',item.source],
    ['Status',nice(item.status)],
    ['Assigned to',item.assigned_to_name||'Unassigned'],
    ['Remarks',item.remarks||'—']
  ];
  return (
    <div className="overlay">
      <div className="view-dialog">
        <div className="modal-top">
          <div>
            <span>LEAD DETAILS</span>
            <h2>{item.name}</h2>
          </div>
          <button onClick={close}>×</button>
        </div>
        <div className="view-grid">
          {values.map(([key,value])=><div key={key}><small>{key}</small><b>{value||'—'}</b></div>)}
        </div>
        <div className="modal-footer">
          <button className="primary" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}

function EyeIcon(){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

function EditIcon(){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function WhatsAppIcon(){
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.487 1.333 5.006L2 22l5.127-1.34c1.464.797 3.116 1.218 4.881 1.218 5.508 0 9.991-4.479 9.991-9.985 0-5.506-4.482-9.993-9.987-9.993zm5.727 14.156c-.24.673-1.402 1.29-1.954 1.344-.51.05-1.162.083-3.691-.941-3.238-1.31-5.321-4.606-5.48-4.819-.16-.213-1.305-1.737-1.305-3.313 0-1.576.825-2.35 1.117-2.67.292-.32.639-.4.853-.4.213 0 .426 0 .613.01.2.01.466-.076.733.56.267.638.907 2.213.987 2.373.08.16.133.346.027.56-.107.213-.16.346-.32.533-.16.187-.336.413-.48.554-.16.16-.326.333-.14.653.187.32.83 1.368 1.782 2.215 1.222 1.089 2.253 1.427 2.573 1.587.32.16.507.133.693-.08.187-.213.799-.933 1.013-1.253.213-.32.426-.267.72-.16.293.107 1.865.879 2.185 1.039.32.16.533.24.613.373.08.133.08.773-.16 1.446z"/>
    </svg>
  );
}

function TrashIcon(){
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}
