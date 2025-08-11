import { supabase } from '../config/supabase';

// Email service for department-based communication

export const emailService = {
  // Get user's inbox
  async getInbox(userId) {
    try {
      const { data, error } = await supabase.rpc('get_user_inbox', {
        p_user_id: userId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching inbox:', error);
      throw error;
    }
  },

  // Send department mail (only for department heads)
  async sendDepartmentMail(subject, body, recipientDepartmentId, isUrgent = false) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('send_department_mail', {
        p_subject: subject,
        p_body: body,
        p_sender_user_id: user.id,
        p_recipient_department_id: recipientDepartmentId,
        p_is_urgent: isUrgent
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending department mail:', error);
      throw error;
    }
  },

  // Mark mail as read
  async markMailAsRead(mailId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('mark_mail_as_read', {
        p_mail_id: mailId,
        p_user_id: user.id
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking mail as read:', error);
      throw error;
    }
  },

  // Get mail analytics (for department heads)
  async getMailAnalytics(mailId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's department
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('department_id')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;

      const { data, error } = await supabase.rpc('get_department_mail_analytics', {
        p_department_id: userData.department_id,
        p_mail_id: mailId
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching mail analytics:', error);
      throw error;
    }
  },

  // Get all departments for sending mails
  async getDepartments() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },

  // Check if user is department head
  async isDepartmentHead(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          employee_type_id,
          employee_types!inner(type_name)
        `)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data.employee_types?.type_name === 'department_head';
    } catch (error) {
      console.error('Error checking department head status:', error);
      return false;
    }
  },

  // Get user's employee type
  async getUserEmployeeType(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          employee_type_id,
          employee_types!inner(type_name, display_name)
        `)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data.employee_types;
    } catch (error) {
      console.error('Error fetching user employee type:', error);
      return null;
    }
  }
};
