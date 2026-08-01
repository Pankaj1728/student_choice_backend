import CallingManagementV2 from './CallingManagementV2';
import './calling-workflow-v6.css';
import './calling-workflow-v7.css';

export default function CallingWorkflowV7() {
  const openSingleNumber = () => document.querySelector('.calling2 .c2actions > button.c2primary:last-child')?.click();
  return <div className="single-number-workflow"><button className="single-number-button" onClick={openSingleNumber}>+ Add single number</button><CallingManagementV2/></div>;
}
